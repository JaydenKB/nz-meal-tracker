import type { Macros } from "./calculate";

export type HealthScoreResult = {
  score: number;
  breakdown: {
    proteinDensity: number;
    macroBalance: number;
    calorieSanity: number;
    wholeFood: number;
  };
  reasons: string[];
};

const TARGETS = {
  proteinCalPct: 0.3,
  fatCalPct: 0.35,
  carbsCalPct: 0.35,
  mealCalMin: 300,
  mealCalMax: 800,
  idealProteinPer100Kcal: 7.5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreProteinDensity(perServing: Macros): number {
  if (perServing.calories <= 0) return 0;
  const proteinPer100Kcal = (perServing.proteinG / perServing.calories) * 100;
  const ratio = proteinPer100Kcal / TARGETS.idealProteinPer100Kcal;
  return clamp(ratio, 0, 1) * 25;
}

function scoreMacroBalance(perServing: Macros): number {
  const totalMacroCal =
    perServing.proteinG * 4 + perServing.fatG * 9 + perServing.carbsG * 4;
  if (totalMacroCal <= 0) return 0;

  const proteinPct = (perServing.proteinG * 4) / totalMacroCal;
  const fatPct = (perServing.fatG * 9) / totalMacroCal;
  const carbsPct = (perServing.carbsG * 4) / totalMacroCal;

  const distance =
    Math.abs(proteinPct - TARGETS.proteinCalPct) +
    Math.abs(fatPct - TARGETS.fatCalPct) +
    Math.abs(carbsPct - TARGETS.carbsCalPct);

  return clamp(1 - distance / 1.2, 0, 1) * 25;
}

function scoreCalorieSanity(perServing: Macros): number {
  const kcal = perServing.calories;
  if (kcal >= TARGETS.mealCalMin && kcal <= TARGETS.mealCalMax) return 25;
  if (kcal < TARGETS.mealCalMin) {
    return clamp(kcal / TARGETS.mealCalMin, 0, 1) * 25;
  }
  const over = kcal - TARGETS.mealCalMax;
  return clamp(1 - over / 600, 0, 1) * 25;
}

function scoreWholeFood(processedRatio: number): number {
  return clamp(1 - processedRatio, 0, 1) * 25;
}

function buildReasons(
  perServing: Macros,
  processedRatio: number,
  breakdown: HealthScoreResult["breakdown"],
): string[] {
  const reasons: string[] = [];

  if (breakdown.proteinDensity >= 18) reasons.push("High protein");
  else if (breakdown.proteinDensity <= 10) reasons.push("Low protein");

  if (breakdown.macroBalance >= 18) reasons.push("Well-balanced macros");
  else if (breakdown.macroBalance <= 10) reasons.push("Unbalanced macros");

  if (perServing.calories > TARGETS.mealCalMax) reasons.push("Calorie-dense");
  else if (perServing.calories < TARGETS.mealCalMin) reasons.push("Light meal");

  if (processedRatio > 0.4) reasons.push("Contains processed ingredients");
  else if (processedRatio === 0) reasons.push("All whole-food ingredients");

  return reasons.slice(0, 3);
}

export function calculateHealthScore(
  perServing: Macros,
  processedIngredientCount: number,
  totalIngredientCount: number,
): HealthScoreResult {
  const processedRatio =
    totalIngredientCount === 0 ? 0 : processedIngredientCount / totalIngredientCount;

  const breakdown = {
    proteinDensity: scoreProteinDensity(perServing),
    macroBalance: scoreMacroBalance(perServing),
    calorieSanity: scoreCalorieSanity(perServing),
    wholeFood: scoreWholeFood(processedRatio),
  };

  const score = Math.round(
    breakdown.proteinDensity +
      breakdown.macroBalance +
      breakdown.calorieSanity +
      breakdown.wholeFood,
  );

  return {
    score: clamp(score, 0, 100),
    breakdown,
    reasons: buildReasons(perServing, processedRatio, breakdown),
  };
}
