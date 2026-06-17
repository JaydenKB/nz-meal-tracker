import { getRecipeWithDetails } from "@/lib/queries";
import { deductCanonicalAmount } from "@/lib/pantry/queries";
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
 * Deduct recipe ingredients from pantry after cooking.
 * Trigger: Cooking Mode finish only (deductPantry=true on log API) — NOT regular "Log this".
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
