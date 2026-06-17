import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingredients, storeProducts } from "@/lib/db/schema";
import { getRecipeCost } from "@/lib/cost/recipe";
import { lineCostFromProduct } from "@/lib/cost/packages";

export type EntryCostResult = {
  cost: number | null;
  isPartial: boolean;
};

/** Estimated grocery cost for a single log entry (one meal slot). */
export async function getLogEntryCost(entry: {
  recipeId: number | null;
  ingredientId: number | null;
  servings: number;
}): Promise<EntryCostResult> {
  if (entry.recipeId) {
    const recipeCost = await getRecipeCost(entry.recipeId);
    if (recipeCost.perMealCost == null) {
      return { cost: null, isPartial: recipeCost.isPartial };
    }
    const cost = Math.round(recipeCost.perMealCost * entry.servings * 100) / 100;
    return { cost, isPartial: recipeCost.isPartial };
  }

  if (entry.ingredientId) {
    const ing = await db.select().from(ingredients).where(eq(ingredients.id, entry.ingredientId)).get();
    if (!ing) return { cost: null, isPartial: false };

    const products = await db.select().from(storeProducts);
    const preferred = products
      .filter((p) => p.ingredientId === ing.id)
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0];

    if (!preferred) return { cost: null, isPartial: false };

    const cost = lineCostFromProduct(
      entry.servings,
      ing.defaultUnit,
      ing.defaultUnit,
      preferred,
    );
    return { cost, isPartial: cost == null };
  }

  return { cost: null, isPartial: false };
}
