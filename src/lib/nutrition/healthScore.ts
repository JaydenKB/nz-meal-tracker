import type { MealType } from "@/lib/db/schema";
import type { Macros } from "./calculate";
import type { ExtendedNutrients } from "./nutrients";
import {
  HEALTH_SCORE_COMPONENT_LABELS,
  HEALTH_SCORE_COMPONENT_MAX,
  type HealthScoreComponentKey,
  MACRO_BALANCE_TARGET,
  MEAL_CAL_BANDS,
  PENALTY_RULES,
  HEALTHY_FAT_PROFILE,
  type PenaltyKey,
  PROTEIN_DENSITY_TARGET,
} from "./healthScore.config";

export type { HealthScoreComponentKey, PenaltyKey };
export { HEALTH_SCORE_COMPONENT_MAX, HEALTH_SCORE_COMPONENT_LABELS, MEAL_CAL_BANDS, PENALTY_RULES };

export type ScoreComponentRow = {
  key: HealthScoreComponentKey;
  label: string;
  points: number;
  maxPoints: number;
  note?: string;
};

export type ScorePenaltyRow = {
  key: PenaltyKey;
  label: string;
  points: number;
  note?: string;
};

export type HealthScoreResult = {
  /** Final clamped score (0–100). */
  final: number;
  /** Alias for `final` — backward compatible. */
  score: number;
  /** Sum of positive components before penalties. */
  base: number;
  /** Total penalty points subtracted. */
  totalPenalties: number;
  components: ScoreComponentRow[];
  penalties: ScorePenaltyRow[];
  /** Plain-English one-liner, deterministic. */
  summary: string;
  /** Top improvement hint for UI (e.g. sodium). */
  improveHint: { message: string; recoverablePoints: number } | null;
  /** @deprecated Use `components` — kept for legacy callers. */
  breakdown: {
    proteinDensity: number;
    macroBalance: number;
    calorieSanity: number;
    wholeFood: number;
    micronutrients: number;
    harmfulNutrients: number;
  };
  /** @deprecated Use `summary` — short tags for badges. */
  reasons: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hasExtendedNutrientData(n: ExtendedNutrients): boolean {
  return Object.values(n).some((v) => v != null && v > 0);
}

function portionFitMultiplier(kcal: number, mealType: MealType | "default"): number {
  const band = MEAL_CAL_BANDS[mealType];
  if (kcal >= band.min && kcal <= band.max) return 1;
  if (kcal < band.min) {
    return clamp(0.88 + (kcal / Math.max(1, band.min)) * 0.12, 0.88, 1);
  }
  const over = kcal - band.max;
  return clamp(1 - over / (band.max * 0.8), 0.55, 1);
}

function scoreProteinDensity(perServing: Macros): number {
  const max = HEALTH_SCORE_COMPONENT_MAX.proteinDensity;
  if (perServing.calories <= 0) return 0;
  const proteinPer100Kcal = (perServing.proteinG / perServing.calories) * 100;
  const ratio = proteinPer100Kcal / PROTEIN_DENSITY_TARGET.idealPer100Kcal;
  return clamp(ratio, 0, 1) * max;
}

function scoreNutrientPerCalorie(
  perServing: Macros,
  nutrients: ExtendedNutrients,
  mealType: MealType | "default",
): { points: number; note?: string } {
  const max = HEALTH_SCORE_COMPONENT_MAX.nutrientPerCalorie;
  const kcal = perServing.calories;
  if (kcal <= 0) return { points: 0 };

  const proteinPer100 = (perServing.proteinG / kcal) * 100;
  const fiberPer100 = ((nutrients.fiberG ?? 0) / kcal) * 100;
  const fatCalShare = (perServing.fatG * 9) / kcal;
  const sugar = nutrients.sugarG ?? 0;
  const sodium = nutrients.sodiumMg ?? 0;

  let density = proteinPer100 * 2.2 + fiberPer100 * 4;

  if (fatCalShare >= 0.65 && sugar < 3 && sodium < 400) {
    density = Math.max(density, 12);
  }

  if ((nutrients.omega3G ?? 0) >= 0.5) density += 4;
  if ((nutrients.potassiumMg ?? 0) >= 300) density += 2;
  if ((nutrients.vitaminCMg ?? 0) >= 10) density += 2;

  const idealDensity = 14;
  let points = clamp(density / idealDensity, 0, 1) * max;
  points *= portionFitMultiplier(kcal, mealType);

  let note: string | undefined;
  if (fatCalShare >= 0.65 && sugar < 3) {
    note = "Calorie-dense fat with minimal sugar — not penalised as junk";
  } else if (kcal < MEAL_CAL_BANDS[mealType].min) {
    note = `Portion fits a ${MEAL_CAL_BANDS[mealType].label} — not penalised for being light`;
  }

  return { points: clamp(points, 0, max), note };
}

function scoreWholeFood(
  processedRatio: number,
  totalIngredientCount: number,
  nutrients: ExtendedNutrients,
): { points: number; note?: string } {
  const max = HEALTH_SCORE_COMPONENT_MAX.wholeFoodRatio;
  const hasProcessedData = totalIngredientCount > 0;

  let fromFlag = 0.5;
  if (hasProcessedData) {
    fromFlag = clamp(1 - processedRatio, 0, 1);
  }

  let fromSignals = 0.5;
  if (hasExtendedNutrientData(nutrients)) {
    fromSignals = 0.45;
    if ((nutrients.fiberG ?? 0) >= 3) fromSignals += 0.2;
    if ((nutrients.sodiumMg ?? 0) > 0 && (nutrients.sodiumMg ?? 0) < 400) fromSignals += 0.15;
    if ((nutrients.sugarG ?? 0) < 8) fromSignals += 0.15;
    fromSignals = clamp(fromSignals, 0, 1);
  }

  const blended = hasProcessedData ? 0.55 * fromFlag + 0.45 * fromSignals : fromSignals;
  const note =
    !hasProcessedData && !hasExtendedNutrientData(nutrients)
      ? "Limited ingredient data — whole-food score is neutral"
      : undefined;

  return { points: clamp(blended, 0, 1) * max, note };
}

function scoreMacroBalance(perServing: Macros, nutrients: ExtendedNutrients): number {
  const max = HEALTH_SCORE_COMPONENT_MAX.macroBalance;
  const kcal = perServing.calories;
  if (kcal > 0) {
    const fatCalShare = (perServing.fatG * 9) / kcal;
    const sugar = nutrients.sugarG ?? 0;
    const sodium = nutrients.sodiumMg ?? 0;
    if (
      fatCalShare >= HEALTHY_FAT_PROFILE.minFatCalShare &&
      sugar < HEALTHY_FAT_PROFILE.maxSugarG &&
      sodium < HEALTHY_FAT_PROFILE.maxSodiumMg
    ) {
      return max * HEALTHY_FAT_PROFILE.macroBalanceRatio;
    }
  }

  const totalMacroCal =
    perServing.proteinG * 4 + perServing.fatG * 9 + perServing.carbsG * 4;
  if (totalMacroCal <= 0) return 0;

  const proteinPct = (perServing.proteinG * 4) / totalMacroCal;
  const fatPct = (perServing.fatG * 9) / totalMacroCal;
  const carbsPct = (perServing.carbsG * 4) / totalMacroCal;

  const distance =
    Math.abs(proteinPct - MACRO_BALANCE_TARGET.proteinCalPct) +
    Math.abs(fatPct - MACRO_BALANCE_TARGET.fatCalPct) +
    Math.abs(carbsPct - MACRO_BALANCE_TARGET.carbsCalPct);

  return clamp(1 - distance / 1.2, 0, 1) * max;
}

function scoreMicronutrients(n: ExtendedNutrients): number {
  const max = HEALTH_SCORE_COMPONENT_MAX.micronutrients;
  let score = 0;

  if ((n.fiberG ?? 0) >= 8) score += 5;
  else if ((n.fiberG ?? 0) >= 5) score += 3.5;
  else if ((n.fiberG ?? 0) >= 3) score += 2;

  if ((n.omega3G ?? 0) >= 1) score += 3;
  else if ((n.omega3G ?? 0) >= 0.3) score += 1.5;

  if ((n.vitaminCMg ?? 0) >= 15) score += 1.5;
  if ((n.vitaminDMcg ?? 0) >= 2) score += 1.5;
  if ((n.ironMg ?? 0) >= 2) score += 1.5;
  if ((n.calciumMg ?? 0) >= 100) score += 1.5;
  if ((n.potassiumMg ?? 0) >= 400) score += 1.5;

  return clamp(score, 0, max);
}

function computePenalties(n: ExtendedNutrients): {
  penalties: ScorePenaltyRow[];
  scoreCap: number | undefined;
} {
  const penalties: ScorePenaltyRow[] = [];
  let scoreCap: number | undefined;

  const sodium = n.sodiumMg ?? 0;
  for (const rule of PENALTY_RULES.sodium) {
    if (sodium > rule.above) {
      penalties.push({
        key: "sodium",
        label: rule.label,
        points: rule.points,
        note: `${Math.round(sodium)} mg sodium per serving`,
      });
      if ("capAt" in rule && rule.capAt != null) {
        scoreCap = scoreCap == null ? rule.capAt : Math.min(scoreCap, rule.capAt);
      }
      break;
    }
  }

  const satFat = n.saturatedFatG ?? 0;
  for (const rule of PENALTY_RULES.saturatedFat) {
    if (satFat > rule.above) {
      penalties.push({
        key: "saturatedFat",
        label: rule.label,
        points: rule.points,
        note: `${satFat.toFixed(1)} g saturated fat per serving`,
      });
      break;
    }
  }

  const sugar = n.sugarG ?? 0;
  for (const rule of PENALTY_RULES.sugar) {
    if (sugar > rule.above) {
      penalties.push({
        key: "sugar",
        label: rule.label,
        points: rule.points,
        note: `${sugar.toFixed(1)} g sugar per serving`,
      });
      break;
    }
  }

  return { penalties, scoreCap };
}

function buildSummary(components: ScoreComponentRow[], penalties: ScorePenaltyRow[]): string {
  const parts: string[] = [];

  const strongest = [...components].sort(
    (a, b) => b.points / b.maxPoints - a.points / a.maxPoints,
  )[0];
  if (strongest && strongest.points / strongest.maxPoints >= 0.72) {
    const label = strongest.label.toLowerCase();
    if (label.includes("protein")) parts.push("Strong protein");
    else if (label.includes("whole")) parts.push("Mostly whole-food");
    else parts.push(`Strong ${label}`);
  }

  const weakest = [...components].sort(
    (a, b) => a.points / a.maxPoints - b.points / b.maxPoints,
  )[0];
  const topPenalty = [...penalties].sort((a, b) => b.points - a.points)[0];

  if (topPenalty) {
    const drag =
      topPenalty.key === "sodium"
        ? "sodium is what's holding it back"
        : `${topPenalty.label.toLowerCase()} is the main drag`;
    parts.push(parts.length > 0 ? drag.charAt(0).toUpperCase() + drag.slice(1) : drag);
  } else if (weakest && weakest.points / weakest.maxPoints < 0.45) {
    parts.push(`${weakest.label} is holding it back`);
  }

  if (parts.length === 0) return "Balanced overall";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}. ${parts[1].charAt(0).toLowerCase()}${parts[1].slice(1)}`;
}

function buildImproveHint(penalties: ScorePenaltyRow[]): HealthScoreResult["improveHint"] {
  const top = [...penalties].sort((a, b) => b.points - a.points)[0];
  if (!top) return null;

  if (top.key === "sodium") {
    return {
      message: `Cut sodium to gain back ~${top.points} points`,
      recoverablePoints: top.points,
    };
  }
  if (top.key === "saturatedFat") {
    return {
      message: `Lower saturated fat to gain back ~${top.points} points`,
      recoverablePoints: top.points,
    };
  }
  if (top.key === "sugar") {
    return {
      message: `Reduce added sugar to gain back ~${top.points} points`,
      recoverablePoints: top.points,
    };
  }
  return null;
}

function buildReasons(summary: string, components: ScoreComponentRow[], penalties: ScorePenaltyRow[]): string[] {
  const reasons: string[] = [];
  if (summary) reasons.push(summary.split(".")[0]);

  const protein = components.find((c) => c.key === "proteinDensity");
  if (protein && protein.points / protein.maxPoints >= 0.72) reasons.push("High protein");
  if (penalties.some((p) => p.key === "sodium")) reasons.push("High sodium");

  return reasons.slice(0, 4);
}

export function calculateHealthScore(
  perServing: Macros,
  processedIngredientCount: number,
  totalIngredientCount: number,
  perServingNutrients: ExtendedNutrients = {},
  mealType: MealType | "default" = "default",
): HealthScoreResult {
  const processedRatio =
    totalIngredientCount === 0 ? 0 : processedIngredientCount / totalIngredientCount;

  const proteinPoints = scoreProteinDensity(perServing);
  const nutrientResult = scoreNutrientPerCalorie(perServing, perServingNutrients, mealType);
  const wholeFoodResult = scoreWholeFood(
    processedRatio,
    totalIngredientCount,
    perServingNutrients,
  );
  const macroPoints = scoreMacroBalance(perServing, perServingNutrients);
  const microPoints = scoreMicronutrients(perServingNutrients);

  const components: ScoreComponentRow[] = [
    {
      key: "proteinDensity",
      label: HEALTH_SCORE_COMPONENT_LABELS.proteinDensity,
      points: Math.round(proteinPoints * 10) / 10,
      maxPoints: HEALTH_SCORE_COMPONENT_MAX.proteinDensity,
    },
    {
      key: "nutrientPerCalorie",
      label: HEALTH_SCORE_COMPONENT_LABELS.nutrientPerCalorie,
      points: Math.round(nutrientResult.points * 10) / 10,
      maxPoints: HEALTH_SCORE_COMPONENT_MAX.nutrientPerCalorie,
      note: nutrientResult.note,
    },
    {
      key: "wholeFoodRatio",
      label: HEALTH_SCORE_COMPONENT_LABELS.wholeFoodRatio,
      points: Math.round(wholeFoodResult.points * 10) / 10,
      maxPoints: HEALTH_SCORE_COMPONENT_MAX.wholeFoodRatio,
      note: wholeFoodResult.note,
    },
    {
      key: "macroBalance",
      label: HEALTH_SCORE_COMPONENT_LABELS.macroBalance,
      points: Math.round(macroPoints * 10) / 10,
      maxPoints: HEALTH_SCORE_COMPONENT_MAX.macroBalance,
    },
    {
      key: "micronutrients",
      label: HEALTH_SCORE_COMPONENT_LABELS.micronutrients,
      points: Math.round(microPoints * 10) / 10,
      maxPoints: HEALTH_SCORE_COMPONENT_MAX.micronutrients,
    },
  ];

  const base = Math.round(components.reduce((s, c) => s + c.points, 0));
  const { penalties: penaltyRows, scoreCap } = computePenalties(perServingNutrients);
  const totalPenalties = penaltyRows.reduce((s, p) => s + p.points, 0);

  let final = clamp(base - totalPenalties, 0, 100);
  if (scoreCap != null) final = Math.min(final, scoreCap);

  const summary = buildSummary(components, penaltyRows);
  const improveHint = buildImproveHint(penaltyRows);

  return {
    final,
    score: final,
    base,
    totalPenalties,
    components,
    penalties: penaltyRows,
    summary,
    improveHint,
    breakdown: {
      proteinDensity: components[0].points,
      macroBalance: components[3].points,
      calorieSanity: components[1].points,
      wholeFood: components[2].points,
      micronutrients: components[4].points,
      harmfulNutrients: -totalPenalties,
    },
    reasons: buildReasons(summary, components, penaltyRows),
  };
}

/** Reference helper for tests — score a single-ingredient portion. */
export function scoreReferenceFood(
  perServing: Macros,
  nutrients: ExtendedNutrients,
  options?: {
    isProcessed?: boolean;
    mealType?: MealType | "default";
  },
): HealthScoreResult {
  return calculateHealthScore(
    perServing,
    options?.isProcessed ? 1 : 0,
    1,
    nutrients,
    options?.mealType ?? "default",
  );
}
