import type { Macros } from "./calculate";
import type { ExtendedNutrients } from "./nutrients";

export type HealthScoreResult = {
  score: number;
  breakdown: {
    proteinDensity: number;
    macroBalance: number;
    calorieSanity: number;
    wholeFood: number;
    micronutrients: number;
    harmfulNutrients: number;
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
  return clamp(ratio, 0, 1) * 18;
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

  return clamp(1 - distance / 1.2, 0, 1) * 18;
}

function scoreCalorieSanity(perServing: Macros): number {
  const kcal = perServing.calories;
  if (kcal >= TARGETS.mealCalMin && kcal <= TARGETS.mealCalMax) return 14;
  if (kcal < TARGETS.mealCalMin) {
    return clamp(kcal / TARGETS.mealCalMin, 0, 1) * 14;
  }
  const over = kcal - TARGETS.mealCalMax;
  return clamp(1 - over / 600, 0, 1) * 14;
}

function scoreWholeFood(processedRatio: number): number {
  return clamp(1 - processedRatio, 0, 1) * 14;
}

function scoreMicronutrients(n: ExtendedNutrients): number {
  let score = 0;

  if ((n.fiberG ?? 0) >= 8) score += 6;
  else if ((n.fiberG ?? 0) >= 5) score += 4;
  else if ((n.fiberG ?? 0) >= 3) score += 2;

  if ((n.omega3G ?? 0) >= 1) score += 4;
  else if ((n.omega3G ?? 0) >= 0.3) score += 2;

  if ((n.vitaminCMg ?? 0) >= 15) score += 2;
  if ((n.vitaminDMcg ?? 0) >= 2) score += 2;
  if ((n.ironMg ?? 0) >= 2) score += 2;
  if ((n.calciumMg ?? 0) >= 100) score += 2;
  if ((n.potassiumMg ?? 0) >= 400) score += 2;

  return clamp(score, 0, 18);
}

function scoreHarmfulNutrients(n: ExtendedNutrients): number {
  let penalty = 0;

  const sodium = n.sodiumMg ?? 0;
  if (sodium > 900) penalty += 10;
  else if (sodium > 600) penalty += 6;
  else if (sodium > 400) penalty += 3;

  const satFat = n.saturatedFatG ?? 0;
  if (satFat > 12) penalty += 8;
  else if (satFat > 8) penalty += 5;
  else if (satFat > 5) penalty += 2;

  const sugar = n.sugarG ?? 0;
  if (sugar > 20) penalty += 8;
  else if (sugar > 12) penalty += 5;
  else if (sugar > 8) penalty += 2;

  return clamp(18 - penalty, 0, 18);
}

function buildReasons(
  perServing: Macros,
  nutrients: ExtendedNutrients,
  processedRatio: number,
  breakdown: HealthScoreResult["breakdown"],
): string[] {
  const reasons: string[] = [];

  if (breakdown.proteinDensity >= 14) reasons.push("High protein");
  else if (breakdown.proteinDensity <= 8) reasons.push("Low protein");

  if (breakdown.macroBalance >= 14) reasons.push("Well-balanced macros");
  else if (breakdown.macroBalance <= 8) reasons.push("Unbalanced macros");

  if (perServing.calories > TARGETS.mealCalMax) reasons.push("Calorie-dense");
  else if (perServing.calories < TARGETS.mealCalMin) reasons.push("Light meal");

  if ((nutrients.fiberG ?? 0) >= 5) reasons.push("Good fibre");
  if ((nutrients.sodiumMg ?? 0) > 600) reasons.push("High sodium");
  if ((nutrients.omega3G ?? 0) >= 0.5) reasons.push("Omega-3 rich");

  if (processedRatio > 0.4) reasons.push("Contains processed ingredients");
  else if (processedRatio === 0) reasons.push("All whole-food ingredients");

  return reasons.slice(0, 4);
}

export function calculateHealthScore(
  perServing: Macros,
  processedIngredientCount: number,
  totalIngredientCount: number,
  perServingNutrients: ExtendedNutrients = {},
): HealthScoreResult {
  const processedRatio =
    totalIngredientCount === 0 ? 0 : processedIngredientCount / totalIngredientCount;

  const breakdown = {
    proteinDensity: scoreProteinDensity(perServing),
    macroBalance: scoreMacroBalance(perServing),
    calorieSanity: scoreCalorieSanity(perServing),
    wholeFood: scoreWholeFood(processedRatio),
    micronutrients: scoreMicronutrients(perServingNutrients),
    harmfulNutrients: scoreHarmfulNutrients(perServingNutrients),
  };

  const score = Math.round(
    breakdown.proteinDensity +
      breakdown.macroBalance +
      breakdown.calorieSanity +
      breakdown.wholeFood +
      breakdown.micronutrients +
      breakdown.harmfulNutrients,
  );

  return {
    score: clamp(score, 0, 100),
    breakdown,
    reasons: buildReasons(perServing, perServingNutrients, processedRatio, breakdown),
  };
}
