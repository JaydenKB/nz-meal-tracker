/**
 * Week boundaries use Monday as day 1 (ISO / NZ convention).
 * Avg macros "per day" on the calendar = sum(entries) / 7 for the visible Mon–Sun week.
 * Eaten-only avg divides by days that have at least one eaten entry (min 1).
 */
import { shiftDate, todayString } from "@/lib/log/compute";

export const WEEK_DAYS = 7;

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday on or before the given date (YYYY-MM-DD). */
export function startOfWeek(dateStr: string): string {
  const d = parseDate(dateStr);
  const dayOfWeek = d.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d.toLocaleDateString("en-CA");
}

export function endOfWeek(weekStart: string): string {
  return shiftDate(weekStart, WEEK_DAYS - 1);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: WEEK_DAYS }, (_, i) => shiftDate(weekStart, i));
}

export function formatWeekRange(weekStart: string): string {
  const end = endOfWeek(weekStart);
  const startD = parseDate(weekStart);
  const endD = parseDate(end);
  const startDay = startD.getDate();
  const endDay = endD.getDate();
  const endMonth = endD.toLocaleDateString("en-NZ", { month: "short" });
  if (startD.getMonth() === endD.getMonth()) {
    return `${startDay}–${endDay} ${endMonth}`;
  }
  const startMonth = startD.toLocaleDateString("en-NZ", { month: "short" });
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

export function formatWeekSummaryTitle(weekStart: string): string {
  const end = endOfWeek(weekStart);
  const startD = parseDate(weekStart);
  const endD = parseDate(end);
  const startPart = startD.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
  const endPart = endD.toLocaleDateString("en-NZ", { day: "numeric", month: "long" });
  return `${startPart} – ${endPart}`;
}

export function dayShortLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString("en-NZ", { weekday: "short" }).slice(0, 3);
}

export function dayNumberLabel(dateStr: string): string {
  return String(parseDate(dateStr).getDate());
}

export function formatDayHeader(dateStr: string): string {
  const d = parseDate(dateStr);
  const weekday = d.toLocaleDateString("en-NZ", { weekday: "long" }).toUpperCase();
  return `${weekday} ${d.getDate()}`;
}

/** Default status when logging: future → planned, today/past → eaten. */
export function inferLogStatus(date: string): "eaten" | "planned" {
  return date > todayString() ? "planned" : "eaten";
}

export function isFutureDate(date: string): boolean {
  return date > todayString();
}

export function isPastDate(date: string): boolean {
  return date < todayString();
}
