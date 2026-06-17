import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import { aiScanProductLabels, aiVisionModelLabel } from "@/lib/ai/provider";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/errors";
import { effectiveAiProvider } from "@/lib/ai/settings";
import { normalizeScannedItem, type DetectedItem } from "@/lib/import/types";
import { enrichFromPublicDatabase } from "@/lib/nutrition/lookup";
import { getAppSettings } from "@/lib/log/queries";
import { upsertPantryStock } from "@/lib/pantry/queries";
import { toCanonicalAmount } from "@/lib/pantry/canonical";

export const runtime = "nodejs";

async function enrichDetectedItem(item: DetectedItem): Promise<DetectedItem> {
  try {
    const enriched = await enrichFromPublicDatabase({
      name: item.name,
      calories: item.calories,
      proteinG: item.proteinG,
      fatG: item.fatG,
      carbsG: item.carbsG,
    });
    if (!enriched) return item;
    return {
      ...item,
      calories: enriched.calories,
      proteinG: enriched.proteinG,
      fatG: enriched.fatG,
      carbsG: enriched.carbsG,
      nutrients: enriched.nutrients,
      nutritionSource: enriched.source,
    };
  } catch {
    return item;
  }
}

/** Scan front + back label images — returns editable draft (no save). */
export async function PUT(request: Request) {
  const body = await request.json();
  const front = typeof body.frontImage === "string" ? body.frontImage : undefined;
  const back = typeof body.backImage === "string" ? body.backImage : undefined;
  const hintName = typeof body.hintName === "string" ? body.hintName : undefined;

  const images = [front, back].filter(Boolean) as string[];
  if (images.length === 0) {
    return NextResponse.json({ error: "At least one label photo required" }, { status: 400 });
  }

  try {
    const settings = await getAppSettings();
    const raw = await aiScanProductLabels(settings, images, hintName);
    const item = await enrichDetectedItem(normalizeScannedItem(raw, 0, "label-"));

    return NextResponse.json({
      item,
      visionModel: aiVisionModelLabel(settings),
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
    });
  } catch (error) {
    return NextResponse.json({ error: aiErrorMessage(error) }, { status: aiErrorStatus(error) });
  }
}

type SaveBody = {
  name: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  packageSize: number;
  isProcessed?: boolean;
  pantryQuantity?: number;
  pantryUnit?: string;
  barcode?: string;
  addToPantry?: boolean;
};

/** Create ingredient from label draft and add to pantry. */
export async function POST(request: Request) {
  const body = (await request.json()) as SaveBody;
  const name = String(body.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const packageSize = Math.max(0, Number(body.packageSize ?? 0));
  const pantryQuantity = Number(body.pantryQuantity ?? packageSize);
  const pantryUnit = String(body.pantryUnit ?? "g");
  const barcodeRaw = typeof body.barcode === "string" ? body.barcode.replace(/\D/g, "") : "";
  const barcode = barcodeRaw.length >= 7 ? barcodeRaw : null;

  const [ingredient] = await db
    .insert(ingredients)
    .values({
      name,
      barcode,
      defaultUnit: "g",
      calories: Math.round(Number(body.calories ?? 0)),
      proteinG: Math.round(Number(body.proteinG ?? 0) * 10) / 10,
      fatG: Math.round(Number(body.fatG ?? 0) * 10) / 10,
      carbsG: Math.round(Number(body.carbsG ?? 0) * 10) / 10,
      isProcessed: Boolean(body.isProcessed ?? true),
      canonicalUnit: "g",
    })
    .returning({ id: ingredients.id });

  let pantryWarning: string | undefined;
  const shouldAddPantry = body.addToPantry !== false;
  if (shouldAddPantry && pantryQuantity > 0) {
    const full = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, ingredient.id))
      .get();
    if (full) {
      const converted = toCanonicalAmount(pantryQuantity, pantryUnit, full);
      if (converted.ok) {
        await upsertPantryStock({
          ingredientId: ingredient.id,
          quantity: converted.amount,
          unit: converted.unit,
          reason: "bought",
        });
      } else {
        pantryWarning = "Ingredient created but pantry amount needs manual entry — unit conversion failed";
      }
    }
  }

  revalidatePath("/ingredients");
  revalidatePath("/shop/pantry");

  return NextResponse.json({
    ingredientId: ingredient.id,
    pantryWarning,
  });
}
