import { NextResponse } from "next/server";
import {
  computeWeekCostStats,
  computeWeekMacroStats,
} from "@/lib/calendar/stats";
import {
  dayNumberLabel,
  dayShortLabel,
  endOfWeek,
  formatWeekRange,
  startOfWeek,
  weekDates,
} from "@/lib/calendar/week";
import { getLogEntriesForDateRange } from "@/lib/calendar/queries";
import { todayString } from "@/lib/log/compute";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const today = todayString();
  const weekStart = startOfWeek(searchParams.get("weekStart") ?? today);
  const selectedDate = searchParams.get("date") ?? today;
  const weekEnd = endOfWeek(weekStart);
  const dates = weekDates(weekStart);

  const entries = await getLogEntriesForDateRange(weekStart, weekEnd);
  const macroStats = computeWeekMacroStats(entries);
  const costStats = await computeWeekCostStats(entries);

  const entriesByDate: Record<string, typeof entries> = {};
  for (const d of dates) {
    entriesByDate[d] = entries.filter((e) => e.date === d);
  }

  return NextResponse.json({
    weekStart,
    weekEnd,
    weekLabel: formatWeekRange(weekStart),
    selectedDate,
    today,
    days: dates.map((date) => ({
      date,
      shortLabel: dayShortLabel(date),
      dayNumber: dayNumberLabel(date),
      isToday: date === today,
      isSelected: date === selectedDate,
      entryCount: entriesByDate[date]?.length ?? 0,
    })),
    entries,
    entriesByDate,
    macroStats,
    costStats,
    plannedCount: entries.filter((e) => e.status === "planned").length,
  });
}
