import { NextResponse } from "next/server";
import {
  computeMostUsedIngredients,
  computeWeekCostStats,
  computeWeekMacroStats,
  sortIngredientsByCost,
} from "@/lib/calendar/stats";
import { formatWeekSummaryTitle, startOfWeek, endOfWeek } from "@/lib/calendar/week";
import { getLogEntriesForDateRange } from "@/lib/calendar/queries";
import { todayString } from "@/lib/log/compute";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = startOfWeek(searchParams.get("weekStart") ?? todayString());
  const weekEnd = endOfWeek(weekStart);
  const sort = searchParams.get("sort") === "cost" ? "cost" : "frequency";

  const entries = await getLogEntriesForDateRange(weekStart, weekEnd);
  const macroStats = computeWeekMacroStats(entries);
  const costStats = await computeWeekCostStats(entries);
  let ingredients = await computeMostUsedIngredients(entries);
  if (sort === "cost") {
    ingredients = sortIngredientsByCost(ingredients);
  }

  const unpricedIngredients = ingredients
    .filter((i) => i.totalCost == null)
    .map((i) => i.ingredientName);

  return NextResponse.json({
    weekStart,
    weekEnd,
    title: formatWeekSummaryTitle(weekStart),
    macroStats,
    costStats,
    ingredients,
    sort,
    costCoverage: {
      isPartial: costStats.isPartial || unpricedIngredients.length > 0,
      unpricedIngredients,
      note:
        unpricedIngredients.length > 0
          ? "Some ingredients lack store prices — cost totals exclude them."
          : null,
    },
  });
}
