import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingredients, storeProducts } from "@/lib/db/schema";
import type { DetectedItem } from "@/lib/import/types";
import { serializeNutrients } from "@/lib/nutrition/nutrients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const storeId = Number(body.storeId);
  const items = (body.items as DetectedItem[] | undefined)?.filter((i) => i.selected) ?? [];

  if (!storeId || items.length === 0) {
    return NextResponse.json({ error: "Select at least one item to save" }, { status: 400 });
  }

  const savedIds: number[] = [];

  for (const item of items) {
    if (!item.name?.trim()) continue;

    const [ingredient] = await db
      .insert(ingredients)
      .values({
        name: item.name.trim(),
        defaultUnit: "g",
        calories: Math.round(item.calories),
        proteinG: Math.round(item.proteinG * 10) / 10,
        fatG: Math.round(item.fatG * 10) / 10,
        carbsG: Math.round(item.carbsG * 10) / 10,
        isProcessed: item.isProcessed,
        nutrientsJson: item.nutrients ? serializeNutrients(item.nutrients) : null,
        nutritionSource: item.nutritionSource ?? null,
      })
      .returning({ id: ingredients.id });

    await db.insert(storeProducts).values({
      storeId,
      ingredientId: ingredient.id,
      productName: item.name.trim(),
      packageSize: item.packageSize || 1,
      packageUnit: "g",
      priceNzd: item.priceNzd,
      isPreferred: true,
    });

    savedIds.push(ingredient.id);
  }

  revalidatePath("/ingredients");
  revalidatePath("/stores");

  return NextResponse.json({ saved: savedIds.length, ids: savedIds });
}
