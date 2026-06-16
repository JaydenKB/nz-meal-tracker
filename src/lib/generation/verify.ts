import type { Ingredient } from "@/lib/db/schema";
import {
  calculateLineMacros,
  calculateLineNutrients,
  perServing,
  perServingNutrients,
  roundMacros,
  sumMacros,
  sumNutrients,
  type Macros,
} from "@/lib/nutrition/calculate";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import { clampRecipeAmount } from "./amounts";
import type { RawGeneratedRecipe } from "./types";
import { CALORIE_TARGET_TOLERANCE, getGoalTargets, type RecipeGoal } from "./goals";

export type VerifiedIngredientLine = {
  name: string;
  amount: number;
  unit: string;
  libraryId: number | null;
  matched: boolean;
  ingredient?: Ingredient;
};

export type VerifiedRecipe = {
  name: string;
  servings: number;
  method: string[];
  lines: VerifiedIngredientLine[];
  matchedCount: number;
  selectedCount: number;
  extraIngredients: string[];
  perServing: Macros;
  healthScore: number;
  healthReasons: string[];
  flagged: boolean;
  flagReason?: string;
  coverageNote: string;
};

function fuzzyMatchIngredient(
  name: string,
  libraryId: number | undefined,
  allIngredients: Ingredient[],
  selectedIds: Set<number>,
): Ingredient | null {
  if (libraryId) {
    const byId = allIngredients.find((i) => i.id === libraryId);
    if (byId) return byId;
  }

  const lower = name.toLowerCase().trim();
  const exact = allIngredients.find((i) => i.name.toLowerCase() === lower);
  if (exact) return exact;

  const contains = allIngredients.find(
    (i) =>
      i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()),
  );
  if (contains) return contains;

  // Prefer selected ingredients when ambiguous
  const selectedMatch = allIngredients.find(
    (i) => selectedIds.has(i.id) && lower.includes(i.name.toLowerCase().split(" ")[0]),
  );
  return selectedMatch ?? null;
}

export function verifyGeneratedRecipe(
  raw: RawGeneratedRecipe,
  allIngredients: Ingredient[],
  selectedIngredientIds: number[],
  goal: RecipeGoal,
  targetCaloriesPerServing?: number,
  options?: { surpriseMode?: boolean },
): VerifiedRecipe {
  const selectedSet = new Set(selectedIngredientIds);
  const lines: VerifiedIngredientLine[] = [];
  const extraIngredients: string[] = [];
  const matchedLibraryIds = new Set<number>();

  for (const ing of raw.ingredients) {
    const matched = fuzzyMatchIngredient(
      ing.name,
      ing.library_id,
      allIngredients,
      selectedSet,
    );

    if (matched) {
      matchedLibraryIds.add(matched.id);
      const clamped = clampRecipeAmount(ing.amount, ing.unit, matched, raw.servings);
      lines.push({
        name: matched.name,
        amount: clamped.amount,
        unit: clamped.unit,
        libraryId: matched.id,
        matched: true,
        ingredient: matched,
      });
    } else {
      extraIngredients.push(ing.name);
      lines.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        libraryId: null,
        matched: false,
      });
    }
  }

  const matchedLines = lines.filter((l) => l.matched && l.ingredient);
  let lineMacros = matchedLines.map((l) =>
    calculateLineMacros({
      quantity: l.amount,
      unit: l.unit,
      ingredient: l.ingredient!,
    }),
  );

  const targets = getGoalTargets(goal, targetCaloriesPerServing);
  let total = roundMacros(sumMacros(lineMacros));
  let perServingMacros = roundMacros(perServing(total, raw.servings));

  // Nudge ingredient amounts toward the user's calorie target (up or down)
  if (
    targets.targetCaloriesPerServing &&
    total.calories > 0 &&
    matchedLines.length > 0
  ) {
    const targetTotal = targets.targetCaloriesPerServing * raw.servings;
    const ratio = targetTotal / total.calories;
    const needsAdjust =
      ratio < 1 - CALORIE_TARGET_TOLERANCE || ratio > 1 + CALORIE_TARGET_TOLERANCE;

    if (needsAdjust) {
      const scale = Math.max(0.55, Math.min(1.45, ratio));
      for (let i = 0; i < matchedLines.length; i++) {
        matchedLines[i].amount = Math.max(1, Math.round(matchedLines[i].amount * scale * 10) / 10);
        const line = lines.find((l) => l.libraryId === matchedLines[i].libraryId);
        if (line) line.amount = matchedLines[i].amount;
      }
      lineMacros = matchedLines.map((l) =>
        calculateLineMacros({
          quantity: l.amount,
          unit: l.unit,
          ingredient: l.ingredient!,
        }),
      );
      total = roundMacros(sumMacros(lineMacros));
      perServingMacros = roundMacros(perServing(total, raw.servings));
    }
  }

  const lineNutrients = matchedLines.map((l) =>
    calculateLineNutrients({
      quantity: l.amount,
      unit: l.unit,
      ingredient: l.ingredient!,
    }),
  );

  const perServingExtended = perServingNutrients(
    sumNutrients(lineNutrients),
    raw.servings,
  );

  const processedCount = matchedLines.filter((l) => l.ingredient!.isProcessed).length;
  const health = calculateHealthScore(
    perServingMacros,
    processedCount,
    matchedLines.length || 1,
    perServingExtended,
  );

  let flagged = false;
  let flagReason: string | undefined;

  // Only flag protein if well below goal — calorie target is a guide, not a filter
  if (
    targets.minProteinPerServing &&
    perServingMacros.proteinG < targets.minProteinPerServing * 0.75
  ) {
    flagged = true;
    flagReason = `Light on protein (${Math.round(perServingMacros.proteinG)}g vs ${targets.minProteinPerServing}g target)`;
  }

  const usesFromSelected = [...matchedLibraryIds].filter((id) => selectedSet.has(id)).length;
  const pantryTotal = options?.surpriseMode ? allIngredients.length : selectedIngredientIds.length;

  let coverageNote = options?.surpriseMode
    ? `Uses ${usesFromSelected} of ${pantryTotal} pantry items`
    : `Uses ${usesFromSelected} of your ingredients`;
  if (extraIngredients.length > 0) {
    coverageNote = `Needs ${extraIngredients.length} extra: ${extraIngredients.slice(0, 2).join(", ")}${extraIngredients.length > 2 ? "…" : ""}`;
  } else if (targets.targetCaloriesPerServing) {
    const actual = Math.round(perServingMacros.calories);
    const target = targets.targetCaloriesPerServing;
    coverageNote += ` · ~${actual} kcal/serving (target ${target})`;
  }

  return {
    name: raw.name,
    servings: raw.servings,
    method: raw.method,
    lines,
    matchedCount: matchedLines.length,
    selectedCount: selectedIngredientIds.length,
    extraIngredients,
    perServing: perServingMacros,
    healthScore: health.score,
    healthReasons: health.reasons,
    flagged,
    flagReason,
    coverageNote,
  };
}

export function filterVerifiedRecipes(
  recipes: VerifiedRecipe[],
  includeFlagged = false,
): VerifiedRecipe[] {
  if (includeFlagged) return recipes;
  return recipes.filter((r) => !r.flagged && r.matchedCount > 0);
}
