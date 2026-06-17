import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stores } from "@/lib/db/schema";
import { normalizeScannedItem, type DetectedItem } from "@/lib/import/types";
import { enrichFromPublicDatabase } from "@/lib/nutrition/lookup";
import { getAppSettings } from "@/lib/log/queries";
import { aiScanSingleImage, aiVisionModelLabel } from "@/lib/ai/provider";
import { effectiveAiProvider } from "@/lib/ai/settings";
import { aiErrorJsonResponse, AI_FALLBACK_HINTS } from "@/lib/ai/handler";

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

export async function POST(request: Request) {
  const body = await request.json();
  const storeId = Number(body.storeId);
  const image = typeof body.image === "string" ? body.image : undefined;
  const batchImages = (body.images as string[] | undefined)?.filter(Boolean) ?? [];
  const imageIndex = body.imageIndex != null ? Number(body.imageIndex) : undefined;
  const imageTotal = body.imageTotal != null ? Number(body.imageTotal) : undefined;
  const idOffset = body.idOffset != null ? Number(body.idOffset) : 0;

  const images = image ? [image] : batchImages;

  if (!storeId || images.length === 0) {
    return NextResponse.json(
      { error: "Select a store and at least one screenshot" },
      { status: 400 },
    );
  }

  if (batchImages.length > 1 && !image) {
    return NextResponse.json(
      {
        error:
          "Batch upload deprecated — send one image per request with imageIndex for progress tracking",
      },
      { status: 400 },
    );
  }

  const store = await db.select().from(stores).where(eq(stores.id, storeId)).get();
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  try {
    const settings = await getAppSettings();
    const rawItems = await aiScanSingleImage(settings, store.name, images[0]);

    const normalized = rawItems.map((raw, i) =>
      normalizeScannedItem(raw, idOffset + i, `img${imageIndex ?? 0}-`),
    );
    const items = await Promise.all(normalized.map(enrichDetectedItem));

    return NextResponse.json({
      items,
      itemsFoundThisImage: items.length,
      imageIndex,
      imageTotal,
      visionModel: aiVisionModelLabel(settings),
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
    });
  } catch (error) {
    return aiErrorJsonResponse(error, AI_FALLBACK_HINTS.scan);
  }
}
