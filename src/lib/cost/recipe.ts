import { db } from "@/lib/db";
import { storeProducts } from "@/lib/db/schema";
import { getRecipeWithDetails } from "@/lib/queries";
import { estimatePackagesForLine } from "@/lib/cost/packages";

export type RecipeCostResult = {
  totalCost: number | null;
  perMealCost: number | null;
  pricedCount: number;
  totalIngredients: number;
  unpricedIngredients: string[];
  isPartial: boolean;
};


export async function getRecipeCost(recipeId: number): Promise<RecipeCostResult> {
  const details = await getRecipeWithDetails(recipeId);
  if (!details) {
    return {
      totalCost: null,
      perMealCost: null,
      pricedCount: 0,
      totalIngredients: 0,
      unpricedIngredients: [],
      isPartial: false,
    };
  }

  const products = await db.select().from(storeProducts);
  let total = 0;
  let pricedCount = 0;
  const unpriced: string[] = [];

  for (const line of details.lines) {
    const preferred = products
      .filter((p) => p.ingredientId === line.ingredient.id)
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0];

    if (!preferred?.priceNzd) {
      unpriced.push(line.ingredient.name);
      continue;
    }

    const packages = estimatePackagesForLine(
      line.quantity,
      line.unit,
      line.ingredient.defaultUnit,
      preferred,
    );
    total += preferred.priceNzd * packages;
    pricedCount++;
  }

  if (pricedCount === 0) {
    return {
      totalCost: null,
      perMealCost: null,
      pricedCount: 0,
      totalIngredients: details.lines.length,
      unpricedIngredients: unpriced,
      isPartial: false,
    };
  }

  const totalCost = Math.round(total * 100) / 100;
  const servings = Math.max(1, details.recipe.servings);
  const perMealCost = Math.round((totalCost / servings) * 100) / 100;

  return {
    totalCost,
    perMealCost,
    pricedCount,
    totalIngredients: details.lines.length,
    unpricedIngredients: unpriced,
    isPartial: pricedCount < details.lines.length,
  };
}
