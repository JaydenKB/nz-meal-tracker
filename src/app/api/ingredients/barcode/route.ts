import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import type { BarcodeLookupResponse, BarcodeSaveBody } from "@/lib/import/barcode-types";
import {
  fetchOpenFoodFactsByBarcode,
  isSparseDraft,
  normalizeBarcode,
} from "@/lib/nutrition/lookup/off-barcode";
import { lookupReferenceConversion } from "@/lib/nutrition/conversion-reference";
import { serializeNutrients } from "@/lib/nutrition/nutrients";
import { upsertPantryStock } from "@/lib/pantry/queries";
import { toCanonicalAmount } from "@/lib/pantry/canonical";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("code") ?? "";
  const barcode = normalizeBarcode(raw);

  if (!barcode) {
    return NextResponse.json({ error: "Enter a valid barcode (7–14 digits)" }, { status: 400 });
  }

  const local = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.barcode, barcode))
    .get();

  if (local) {
    const response: BarcodeLookupResponse = {
      status: "local",
      barcode,
      ingredient: {
        id: local.id,
        name: local.name,
        calories: local.calories,
        proteinG: local.proteinG,
        fatG: local.fatG,
        carbsG: local.carbsG,
        canonicalUnit: local.canonicalUnit,
      },
    };
    return NextResponse.json(response);
  }

  try {
    const draft = await fetchOpenFoodFactsByBarcode(barcode);

    if (!draft) {
      const response: BarcodeLookupResponse = { status: "not_found", barcode };
      return NextResponse.json(response);
    }

    if (isSparseDraft(draft)) {
      const response: BarcodeLookupResponse = { status: "not_found", barcode };
      return NextResponse.json(response);
    }

    const status = draft.missingFields.length > 0 ? "partial" : "found";
    const response: BarcodeLookupResponse = { status, barcode, draft };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    if (message === "OFFLINE") {
      const response: BarcodeLookupResponse = {
        status: "offline",
        barcode,
        message: "Can't reach Open Food Facts — check your internet connection or try again later.",
      };
      return NextResponse.json(response, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

function deriveConversionFields(name: string) {
  const ref = lookupReferenceConversion(name);
  return {
    canonicalUnit: "g" as const,
    gramsPerUnit: ref?.gramsPerEach ?? null,
    mlPerGram: ref?.densityGPerMl != null ? 1 / ref.densityGPerMl : null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as BarcodeSaveBody;
  const barcode = normalizeBarcode(body.barcode ?? "");
  const name = String(body.name ?? "").trim();

  if (!barcode) {
    return NextResponse.json({ error: "Valid barcode required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.barcode, barcode))
    .get();

  if (existing) {
    if (body.addToPantry) {
      const packageCount = Math.max(1, Number(body.packageCount ?? 1));
      const packageSize = Math.max(0, Number(body.packageSize ?? 0));
      const qty = packageCount * (packageSize || 100);
      const unit = String(body.packageUnit ?? "g");

      const converted = toCanonicalAmount(qty, unit, existing);
      if (!converted.ok) {
        return NextResponse.json(
          { error: "Unit conversion failed — adjust quantity or conversion settings" },
          { status: 400 },
        );
      }
      await upsertPantryStock({
        ingredientId: existing.id,
        quantity: converted.amount,
        unit: converted.unit,
        reason: "bought",
      });
      revalidatePath("/shop/pantry");
      return NextResponse.json({ ingredientId: existing.id, addedToPantry: true, existing: true });
    }
    return NextResponse.json({ ingredientId: existing.id, existing: true });
  }

  const conversion = deriveConversionFields(name);
  const packageSize = Math.max(0, Number(body.packageSize ?? 0));

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
      nutrientsJson: body.nutrientsJson || null,
      nutritionSource: "openfoodfacts",
      canonicalUnit: conversion.canonicalUnit,
      gramsPerUnit: conversion.gramsPerUnit,
      mlPerGram: conversion.mlPerGram,
    })
    .returning({ id: ingredients.id });

  let pantryWarning: string | undefined;
  if (body.addToPantry !== false) {
    const packageCount = Math.max(1, Number(body.packageCount ?? 1));
    const qty = packageCount * (packageSize || 0);
    if (qty > 0) {
      const full = await db
        .select()
        .from(ingredients)
        .where(eq(ingredients.id, ingredient.id))
        .get();
      if (full) {
        const unit = String(body.packageUnit ?? "g");
        const converted = toCanonicalAmount(qty, unit, full);
        if (converted.ok) {
          await upsertPantryStock({
            ingredientId: ingredient.id,
            quantity: converted.amount,
            unit: converted.unit,
            reason: "bought",
          });
        } else {
          pantryWarning =
            "Ingredient saved but pantry amount needs manual entry — unit conversion failed";
        }
      }
    }
  }

  revalidatePath("/ingredients");
  revalidatePath("/shop/pantry");

  return NextResponse.json({
    ingredientId: ingredient.id,
    pantryWarning,
    addedToPantry: !pantryWarning && body.addToPantry !== false,
  });
}
