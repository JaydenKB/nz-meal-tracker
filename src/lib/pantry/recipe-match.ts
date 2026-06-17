/**
 * Pantry cookability matching — quantity-aware, staple-lenient, conversion-honest.
 *
 * STAPLE LENIENCY (documented rule):
 * Ingredients with pantry_items.is_staple === true NEVER count toward missing/short
 * tallies. Salt, oil, and spices won't demote a recipe to "Almost" when pantry qty
 * is low or untracked. Staples are treated as satisfied for classification.
 *
 * UNCERTAIN CONVERSION:
 * When toCanonicalAmount fails (non-exact cross-kind conversion), the line is
 * marked "uncertain" — it does NOT count as missing and does NOT block "Cook now".
 * The shortfall UI surfaces "check manually" for these lines.
 */

import type { Ingredient } from "@/lib/db/schema";
import type { PantryRow } from "@/lib/pantry/queries";
import {
  formatCanonicalAmount,
  fromCanonicalForDisplay,
  toCanonicalAmount,
} from "@/lib/pantry/canonical";

export type LineMatchStatus = "satisfied" | "short" | "missing" | "staple_ok" | "uncertain";

export type IngredientLineMatch = {
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  status: LineMatchStatus;
  requiredCanonical: number | null;
  requiredUnit: "g" | "ml" | "each" | null;
  onHandCanonical: number | null;
  onHandDisplay: string;
  requiredDisplay: string;
  shortfallCanonical: number | null;
  shortfallDisplay: string | null;
  isStaple: boolean;
};

export type RecipeCookability = "cook_now" | "almost" | "not_yet";

export type RecipePantryMatch = {
  recipeId: number;
  recipeName: string;
  servings: number;
  kcal: number;
  proteinG: number;
  score: number;
  perMealCost: number | null;
  imageUrl: string | null;
  cookability: RecipeCookability;
  /** Missing + short lines (excludes staples & uncertain). */
  gapCount: number;
  shortfallSummary: string;
  lines: IngredientLineMatch[];
  inPantry: IngredientLineMatch[];
  needToBuy: IngredientLineMatch[];
  uncertain: IngredientLineMatch[];
};

type RecipeLineInput = {
  quantity: number;
  unit: string;
  ingredient: Ingredient;
};

function isStapleSatisfied(pantry: PantryRow | undefined): boolean {
  return Boolean(pantry?.isStaple);
}

function formatShortfallDisplay(
  shortfallCanonical: number,
  ingredient: Ingredient,
  unit: "g" | "ml" | "each",
): string {
  const display = fromCanonicalForDisplay(shortfallCanonical, ingredient);
  return `${Math.round(display.quantity * 10) / 10}${display.unit}`;
}

export function matchRecipeLinesToPantry(
  lines: RecipeLineInput[],
  pantryMap: Map<number, PantryRow>,
  servingsMultiplier = 1,
): {
  lines: IngredientLineMatch[];
  gapCount: number;
} {
  const results: IngredientLineMatch[] = [];
  let gapCount = 0;

  for (const line of lines) {
    const scaledQty = line.quantity * servingsMultiplier;
    const pantry = pantryMap.get(line.ingredient.id);
    const isStaple = pantry?.isStaple ?? false;

    if (isStapleSatisfied(pantry)) {
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: scaledQty,
        unit: line.unit,
        status: "staple_ok",
        requiredCanonical: null,
        requiredUnit: null,
        onHandCanonical: pantry?.quantity ?? null,
        onHandDisplay: pantry ? formatCanonicalAmount(pantry.quantity, pantry.unit as "g" | "ml" | "each") : "staple",
        requiredDisplay: `${scaledQty}${line.unit}`,
        shortfallCanonical: null,
        shortfallDisplay: null,
        isStaple: true,
      });
      continue;
    }

    const required = toCanonicalAmount(scaledQty, line.unit, line.ingredient);

    if (!required.ok) {
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: scaledQty,
        unit: line.unit,
        status: "uncertain",
        requiredCanonical: null,
        requiredUnit: null,
        onHandCanonical: pantry?.quantity ?? null,
        onHandDisplay: pantry
          ? formatCanonicalAmount(pantry.quantity, pantry.unit as "g" | "ml" | "each")
          : "not tracked",
        requiredDisplay: `${scaledQty}${line.unit}`,
        shortfallCanonical: null,
        shortfallDisplay: null,
        isStaple: false,
      });
      continue;
    }

    const onHand = pantry?.quantity ?? 0;
    const requiredDisplay = formatCanonicalAmount(required.amount, required.unit);
    const onHandDisplay = pantry
      ? formatCanonicalAmount(pantry.quantity, pantry.unit as "g" | "ml" | "each")
      : "0";

    if (onHand >= required.amount) {
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: scaledQty,
        unit: line.unit,
        status: "satisfied",
        requiredCanonical: required.amount,
        requiredUnit: required.unit,
        onHandCanonical: onHand,
        onHandDisplay,
        requiredDisplay,
        shortfallCanonical: null,
        shortfallDisplay: null,
        isStaple: false,
      });
      continue;
    }

    const shortfall = required.amount - onHand;
    const shortfallDisplay = formatShortfallDisplay(shortfall, line.ingredient, required.unit);

    if (onHand <= 0) {
      gapCount += 1;
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: scaledQty,
        unit: line.unit,
        status: "missing",
        requiredCanonical: required.amount,
        requiredUnit: required.unit,
        onHandCanonical: onHand,
        onHandDisplay,
        requiredDisplay,
        shortfallCanonical: shortfall,
        shortfallDisplay,
        isStaple: false,
      });
    } else {
      gapCount += 1;
      results.push({
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: scaledQty,
        unit: line.unit,
        status: "short",
        requiredCanonical: required.amount,
        requiredUnit: required.unit,
        onHandCanonical: onHand,
        onHandDisplay,
        requiredDisplay,
        shortfallCanonical: shortfall,
        shortfallDisplay,
        isStaple: false,
      });
    }
  }

  return { lines: results, gapCount };
}

export function classifyCookability(gapCount: number): RecipeCookability {
  if (gapCount === 0) return "cook_now";
  if (gapCount <= 2) return "almost";
  return "not_yet";
}

export function buildShortfallSummary(lines: IngredientLineMatch[]): string {
  const gaps = lines.filter((l) => l.status === "missing" || l.status === "short");
  if (gaps.length === 0) return "";

  const parts = gaps.slice(0, 3).map((g) => {
    if (g.status === "missing") return `missing ${g.ingredientName.toLowerCase()}`;
    return `low on ${g.ingredientName.toLowerCase()}`;
  });

  return parts.join(", ");
}

export function buildRecipePantryMatch(input: {
  recipeId: number;
  recipeName: string;
  servings: number;
  kcal: number;
  proteinG: number;
  score: number;
  perMealCost: number | null;
  imageUrl: string | null;
  lines: RecipeLineInput[];
  pantryMap: Map<number, PantryRow>;
  servingsMultiplier?: number;
}): RecipePantryMatch {
  const { lines: matched, gapCount } = matchRecipeLinesToPantry(
    input.lines,
    input.pantryMap,
    input.servingsMultiplier ?? 1,
  );

  const cookability = classifyCookability(gapCount);
  const inPantry = matched.filter(
    (l) => l.status === "satisfied" || l.status === "staple_ok" || l.status === "short",
  );
  const needToBuy = matched.filter((l) => l.status === "missing" || l.status === "short");
  const uncertain = matched.filter((l) => l.status === "uncertain");

  return {
    recipeId: input.recipeId,
    recipeName: input.recipeName,
    servings: input.servings,
    kcal: input.kcal,
    proteinG: input.proteinG,
    score: input.score,
    perMealCost: input.perMealCost,
    imageUrl: input.imageUrl,
    cookability,
    gapCount,
    shortfallSummary: buildShortfallSummary(matched),
    lines: matched,
    inPantry,
    needToBuy,
    uncertain,
  };
}

export function buildShortfallShoppingLines(
  originalLines: RecipeLineInput[],
  match: RecipePantryMatch,
): RecipeLineInput[] {
  const byId = new Map(originalLines.map((l) => [l.ingredient.id, l.ingredient]));

  return match.needToBuy
    .filter((l) => l.shortfallCanonical != null)
    .map((l) => {
      const ingredient = byId.get(l.ingredientId);
      if (!ingredient || l.shortfallCanonical == null) {
        throw new Error(`Missing ingredient ${l.ingredientId}`);
      }
      const display = fromCanonicalForDisplay(l.shortfallCanonical, ingredient);
      return {
        quantity: display.quantity,
        unit: display.unit,
        ingredient,
      };
    });
}
