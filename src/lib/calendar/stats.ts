import { roundMacros, type Macros } from "@/lib/nutrition/calculate";
import type { LogEntryWithMeta } from "@/lib/log/compute";
import { getLogEntryCost } from "@/lib/cost/entry";
import { lineCostFromProduct } from "@/lib/cost/packages";
import { fromCanonicalForDisplay } from "@/lib/pantry/canonical";
import { WEEK_DAYS } from "@/lib/calendar/week";
import { db } from "@/lib/db";
import { storeProducts } from "@/lib/db/schema";
import { aggregateRequiredCanonical } from "@/lib/shopping/weekList";
import { getRecipeWithDetails } from "@/lib/queries";

export type WeekMacroStats = {
  avgPerDay: Macros;
  label: string;
  entryCount: number;
};

export type WeekCostStats = {
  weekTotal: number | null;
  avgPerMeal: number | null;
  mealCount: number;
  pricedMealCount: number;
  isPartial: boolean;
  unpricedMealCount: number;
  label: string;
};

function sumMacros(entries: LogEntryWithMeta[]): Macros {
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

function avgPerWeekDay(total: Macros, divisor: number): Macros {
  const d = Math.max(1, divisor);
  return roundMacros({
    calories: total.calories / d,
    proteinG: total.proteinG / d,
    fatG: total.fatG / d,
    carbsG: total.carbsG / d,
  });
}

function daysWithEatenEntries(entries: LogEntryWithMeta[]): number {
  const days = new Set(entries.filter((e) => e.status === "eaten").map((e) => e.date));
  return Math.max(1, days.size);
}

/** Combined avg = all entries in the Mon–Sun week ÷ 7 (forward-looking plan). */
export function computeWeekMacroStats(entries: LogEntryWithMeta[]): {
  combined: WeekMacroStats;
  eatenOnly: WeekMacroStats;
} {
  const combinedTotal = sumMacros(entries);
  const eatenEntries = entries.filter((e) => e.status === "eaten");
  const eatenTotal = sumMacros(eatenEntries);

  return {
    combined: {
      avgPerDay: avgPerWeekDay(combinedTotal, WEEK_DAYS),
      label: "Avg / day (plan + eaten, ÷ 7 days)",
      entryCount: entries.length,
    },
    eatenOnly: {
      avgPerDay: avgPerWeekDay(eatenTotal, daysWithEatenEntries(eatenEntries)),
      label: "Avg / day (eaten only, ÷ days with meals)",
      entryCount: eatenEntries.length,
    },
  };
}

export async function computeWeekCostStats(
  entries: LogEntryWithMeta[],
  label = "Week cost (all meals in view)",
): Promise<WeekCostStats> {
  let weekTotal = 0;
  let pricedMealCount = 0;
  let unpricedMealCount = 0;

  for (const entry of entries) {
    const { cost, isPartial } = await getLogEntryCost(entry);
    if (cost != null) {
      weekTotal += cost;
      pricedMealCount++;
      if (isPartial) unpricedMealCount++;
    } else {
      unpricedMealCount++;
    }
  }

  const mealCount = entries.length;
  const hasAnyPrice = pricedMealCount > 0;

  return {
    weekTotal: hasAnyPrice ? Math.round(weekTotal * 100) / 100 : null,
    avgPerMeal:
      hasAnyPrice && mealCount > 0
        ? Math.round((weekTotal / mealCount) * 100) / 100
        : null,
    mealCount,
    pricedMealCount,
    isPartial: unpricedMealCount > 0,
    unpricedMealCount,
    label,
  };
}

export type IngredientUsageRow = {
  ingredientId: number;
  ingredientName: string;
  mealCount: number;
  totalQuantity: number;
  unit: string;
  totalCost: number | null;
  isPartialCost: boolean;
};

export async function computeMostUsedIngredients(
  entries: LogEntryWithMeta[],
): Promise<IngredientUsageRow[]> {
  const aggregated = await aggregateRequiredCanonical(entries);
  const mealCountByIngredient = new Map<number, number>();

  for (const entry of entries) {
    if (entry.recipeId) {
      const details = await getRecipeWithDetails(entry.recipeId);
      if (!details) continue;
      for (const line of details.lines) {
        mealCountByIngredient.set(
          line.ingredient.id,
          (mealCountByIngredient.get(line.ingredient.id) ?? 0) + 1,
        );
      }
    } else if (entry.ingredientId) {
      mealCountByIngredient.set(
        entry.ingredientId,
        (mealCountByIngredient.get(entry.ingredientId) ?? 0) + 1,
      );
    }
  }

  const products = await db.select().from(storeProducts);
  const rows: IngredientUsageRow[] = [];

  for (const [ingredientId, req] of aggregated) {
    const preferred = products
      .filter((p) => p.ingredientId === ingredientId)
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred))[0];

    let totalCost: number | null = null;
    let isPartialCost = false;

    if (preferred?.priceNzd) {
      const display = fromCanonicalForDisplay(req.amount, req.ingredient);
      totalCost = lineCostFromProduct(
        display.quantity,
        display.unit,
        req.ingredient.defaultUnit,
        preferred,
      );
    } else {
      isPartialCost = true;
    }

    rows.push({
      ingredientId,
      ingredientName: req.ingredient.name,
      mealCount: mealCountByIngredient.get(ingredientId) ?? 0,
      totalQuantity: req.amount,
      unit: req.unit,
      totalCost,
      isPartialCost,
    });
  }

  rows.sort((a, b) => b.mealCount - a.mealCount || b.totalQuantity - a.totalQuantity);
  return rows;
}

export function sortIngredientsByCost(rows: IngredientUsageRow[]): IngredientUsageRow[] {
  return [...rows].sort((a, b) => {
    const ac = a.totalCost ?? -1;
    const bc = b.totalCost ?? -1;
    return bc - ac || b.mealCount - a.mealCount;
  });
}
