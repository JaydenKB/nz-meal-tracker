import type { Ingredient } from "@/lib/db/schema";
import {
  calculateLineMacros,
  calculateLineNutrients,
  perServing,
  perServingNutrients,
  roundMacros,
  sumMacros,
  sumNutrients,
} from "@/lib/nutrition/calculate";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import type { SuggestionAction } from "@/lib/suggestions/ollama";
import { resolveSuggestionAction } from "@/lib/suggestions/infer";
import type { SimLine } from "@/lib/suggestions/simulate";
import { simulateSuggestion } from "@/lib/suggestions/simulate";

export function scoreFromSimLines(lines: SimLine[], servings: number): number {
  const macros = lines.map((l) =>
    calculateLineMacros({ quantity: l.quantity, unit: l.unit, ingredient: l }),
  );
  const nutrients = lines.map((l) =>
    calculateLineNutrients({ quantity: l.quantity, unit: l.unit, ingredient: l }),
  );
  const perServingMacros = roundMacros(perServing(roundMacros(sumMacros(macros)), servings));
  const perServingExtended = perServingNutrients(sumNutrients(nutrients), servings);
  const processedCount = lines.filter((l) => l.isProcessed).length;
  return calculateHealthScore(
    perServingMacros,
    processedCount,
    lines.length,
    perServingExtended,
  ).score;
}

export function simulateAndScore(
  baseLines: SimLine[],
  suggestion: SuggestionAction,
  servings: number,
  currentScore: number,
  ingredientMap: Map<number, Ingredient>,
): { afterLines: SimLine[]; afterScore: number; delta: number; changed: boolean } {
  const action = resolveSuggestionAction(suggestion);
  const normalized = { ...suggestion, action };
  const afterLines = simulateSuggestion(baseLines, normalized, ingredientMap);
  const changed = afterLines !== baseLines && JSON.stringify(afterLines) !== JSON.stringify(baseLines);
  const afterScore = scoreFromSimLines(afterLines, servings);
  return {
    afterLines,
    afterScore,
    delta: afterScore - currentScore,
    changed,
  };
}
