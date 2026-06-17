import { getRecipeWithDetails } from "@/lib/queries";
import { deductCanonicalAmount, getPantryMap } from "@/lib/pantry/queries";
import { toCanonicalAmount } from "@/lib/pantry/canonical";

export type PantryDeductionResult = {
  ingredientId: number;
  ingredientName: string;
  requested: number;
  deducted: number;
  unit: string;
  ranOut: boolean;
  skipped: boolean;
  skipReason?: string;
};

/**
 * Deduct recipe ingredients from pantry after cooking or marking a planned meal eaten.
 * Trigger: Cooking Mode finish (deductPantry=true) or PATCH mark-eaten — NOT regular "Log this".
 */
export async function deductRecipeFromPantry(
  recipeId: number,
  servings: number,
  logEntryId?: number,
): Promise<PantryDeductionResult[]> {
  const details = await getRecipeWithDetails(recipeId);
  if (!details) return [];

  const scale = servings / Math.max(1, details.recipe.servings);
  const results: PantryDeductionResult[] = [];

  for (const line of details.lines) {
    const scaledQty = line.quantity * scale;
    const converted = toCanonicalAmount(scaledQty, line.unit, line.ingredient);

    if (!converted.ok) {
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        requested: 0,
        deducted: 0,
        unit: "",
        ranOut: false,
        skipped: true,
        skipReason: converted.reason,
      });
      continue;
    }

    const { deducted, ranOut } = await deductCanonicalAmount(
      line.ingredient.id,
      converted.amount,
      "cooked",
      logEntryId ?? null,
    );

    results.push({
      ingredientId: line.ingredient.id,
      ingredientName: line.ingredient.name,
      requested: converted.amount,
      deducted,
      unit: converted.unit,
      ranOut,
      skipped: false,
    });
  }

  return results;
}

/** Ingredients likely low or depleted after cooking this recipe (for finish-screen hints). */
export async function getPostCookLowStockHints(
  recipeId: number,
  servings: number,
): Promise<{ ingredientId: number; name: string }[]> {
  const details = await getRecipeWithDetails(recipeId);
  if (!details) return [];

  const pantryMap = await getPantryMap();
  const scale = servings / Math.max(1, details.recipe.servings);
  const hints: { ingredientId: number; name: string }[] = [];

  for (const line of details.lines) {
    const pantry = pantryMap.get(line.ingredient.id);
    if (!pantry || pantry.isStaple) continue;

    const scaledQty = line.quantity * scale;
    const converted = toCanonicalAmount(scaledQty, line.unit, line.ingredient);
    if (!converted.ok) continue;

    const remaining = pantry.quantity - converted.amount;
    const threshold = pantry.lowThreshold ?? converted.amount * 0.25;
    if (remaining <= threshold || remaining <= 0) {
      hints.push({ ingredientId: line.ingredient.id, name: line.ingredient.name });
    }
  }

  return hints;
}
