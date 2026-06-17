import type { MealType } from "@/lib/db/schema";

/** Positive component max points — must sum to 100. */
export const HEALTH_SCORE_COMPONENT_MAX = {
  proteinDensity: 25,
  nutrientPerCalorie: 22,
  wholeFoodRatio: 20,
  macroBalance: 18,
  micronutrients: 15,
} as const;

export type HealthScoreComponentKey = keyof typeof HEALTH_SCORE_COMPONENT_MAX;

export const HEALTH_SCORE_COMPONENT_LABELS: Record<HealthScoreComponentKey, string> = {
  proteinDensity: "Protein density",
  nutrientPerCalorie: "Nutrient per calorie",
  wholeFoodRatio: "Whole-food ratio",
  macroBalance: "Macro balance",
  micronutrients: "Micronutrients",
};

/** Ideal per-serving calorie bands by meal type (portion-aware checks). */
export const MEAL_CAL_BANDS: Record<
  MealType | "default",
  { min: number; ideal: number; max: number; label: string }
> = {
  snack: { min: 80, ideal: 200, max: 350, label: "snack" },
  breakfast: { min: 200, ideal: 400, max: 600, label: "breakfast" },
  lunch: { min: 300, ideal: 550, max: 800, label: "lunch" },
  dinner: { min: 350, ideal: 600, max: 900, label: "dinner" },
  default: { min: 250, ideal: 500, max: 800, label: "meal serving" },
};

export const PROTEIN_DENSITY_TARGET = {
  /** g protein per 100 kcal for a strong score */
  idealPer100Kcal: 7.5,
};

export const MACRO_BALANCE_TARGET = {
  proteinCalPct: 0.3,
  fatCalPct: 0.35,
  carbsCalPct: 0.35,
};

/** Nutrient-dense fat sources (olive oil, nuts, avocado) — not "unbalanced junk". */
export const HEALTHY_FAT_PROFILE = {
  minFatCalShare: 0.85,
  maxSugarG: 3,
  maxSodiumMg: 400,
  /** Partial macro-balance credit (0–1 of max points). */
  macroBalanceRatio: 0.55,
} as const;

export const PENALTY_RULES = {
  sodium: [
    { above: 900, points: 18, label: "Sodium (very high)", capAt: 62 },
    { above: 600, points: 10, label: "Sodium (high)", capAt: 72 },
    { above: 400, points: 5, label: "Sodium (moderate)", capAt: undefined },
  ],
  saturatedFat: [
    { above: 12, points: 10, label: "Saturated fat (high)" },
    { above: 8, points: 6, label: "Saturated fat (moderate)" },
    { above: 5, points: 2, label: "Saturated fat (slight)" },
  ],
  sugar: [
    { above: 20, points: 10, label: "Added sugar (high)" },
    { above: 12, points: 6, label: "Added sugar (moderate)" },
    { above: 8, points: 2, label: "Added sugar (slight)" },
  ],
} as const;

export type PenaltyKey = keyof typeof PENALTY_RULES;

export const PENALTY_LABELS: Record<PenaltyKey, string> = {
  sodium: "Sodium",
  saturatedFat: "Saturated fat",
  sugar: "Added sugar",
};
