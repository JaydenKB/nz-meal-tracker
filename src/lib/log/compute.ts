import type { DailyLogEntry, Ingredient, LogStatus, MealType } from "@/lib/db/schema";
import {
  calculateLineMacros,
  roundMacros,
  type Macros,
} from "@/lib/nutrition/calculate";

export type LogEntryWithMeta = {
  id: number;
  date: string;
  mealType: MealType;
  status: LogStatus;
  servings: number;
  loggedAt: string;
  name: string;
  recipeId: number | null;
  ingredientId: number | null;
  macros: Macros;
  accentIndex: number;
  entryCost: number | null;
  costPartial: boolean;
};

export function computeEntryMacros(
  entry: Pick<DailyLogEntry, "recipeId" | "ingredientId" | "servings">,
  options: {
    ingredient?: Ingredient | null;
    recipePerServing?: Macros | null;
  } = {},
): Macros {
  if (entry.recipeId && options.recipePerServing) {
    const scaled = {
      calories: options.recipePerServing.calories * entry.servings,
      proteinG: options.recipePerServing.proteinG * entry.servings,
      fatG: options.recipePerServing.fatG * entry.servings,
      carbsG: options.recipePerServing.carbsG * entry.servings,
    };
    return roundMacros(scaled);
  }

  if (entry.ingredientId && options.ingredient) {
    return roundMacros(
      calculateLineMacros({
        quantity: entry.servings,
        unit: options.ingredient.defaultUnit,
        ingredient: options.ingredient,
      }),
    );
  }

  return { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 };
}

export function sumDailyMacros(
  entries: LogEntryWithMeta[],
  options?: { status?: LogStatus },
): Macros {
  const filtered = options?.status
    ? entries.filter((e) => e.status === options.status)
    : entries.filter((e) => e.status === "eaten");
  return roundMacros(
    filtered.reduce(
      (acc, e) => ({
        calories: acc.calories + e.macros.calories,
        proteinG: acc.proteinG + e.macros.proteinG,
        fatG: acc.fatG + e.macros.fatG,
        carbsG: acc.carbsG + e.macros.carbsG,
      }),
      { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
    ),
  );
}

export function sumAllMacros(entries: LogEntryWithMeta[]): Macros {
  return roundMacros(
    entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.macros.calories,
        proteinG: acc.proteinG + e.macros.proteinG,
        fatG: acc.fatG + e.macros.fatG,
        carbsG: acc.carbsG + e.macros.carbsG,
      }),
      { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
    ),
  );
}

export function formatDateLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  const today = todayString();
  const yesterday = shiftDate(today, -1);

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";

  return date.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

export function todayString(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function shiftDate(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function zeroMacros(): Macros {
  return { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 };
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
