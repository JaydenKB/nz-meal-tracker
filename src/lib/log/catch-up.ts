import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyLogEntries } from "@/lib/db/schema";
import { enrichLogEntries, markLogEntryEaten } from "@/lib/log/queries";
import type { LogEntryWithMeta } from "@/lib/log/compute";
import { todayString } from "@/lib/log/compute";

export type CatchUpEntry = LogEntryWithMeta & {
  recipeId: number | null;
};

export async function getUnresolvedPastPlanned(): Promise<CatchUpEntry[]> {
  const today = todayString();
  const rows = await db
    .select()
    .from(dailyLogEntries)
    .where(and(eq(dailyLogEntries.status, "planned"), lt(dailyLogEntries.date, today)))
    .orderBy(dailyLogEntries.date, dailyLogEntries.loggedAt);

  return enrichLogEntries(rows);
}

export async function resolveCatchUpEntry(
  id: number,
  action: "ate-it" | "skipped" | "replaced",
): Promise<{ entry: CatchUpEntry | null; pantryDeduction?: unknown }> {
  if (action === "ate-it") {
    const result = await markLogEntryEaten(id);
    if (!result.entry) return { entry: null };
    const [enriched] = await enrichLogEntries([result.entry]);
    return { entry: enriched, pantryDeduction: result.pantryDeduction };
  }

  const status = action === "skipped" ? "skipped" : "replaced";
  const [entry] = await db
    .update(dailyLogEntries)
    .set({ status })
    .where(eq(dailyLogEntries.id, id))
    .returning();

  if (!entry) return { entry: null };
  const [enriched] = await enrichLogEntries([entry]);
  return { entry: enriched };
}

export async function skipAllUnresolvedPastPlanned(): Promise<number> {
  const today = todayString();
  const result = await db
    .update(dailyLogEntries)
    .set({ status: "skipped" })
    .where(and(eq(dailyLogEntries.status, "planned"), lt(dailyLogEntries.date, today)))
    .returning({ id: dailyLogEntries.id });
  return result.length;
}

export async function countUnresolvedPastPlanned(): Promise<number> {
  const today = todayString();
  const row = await db
    .select({ c: sql<number>`count(*)` })
    .from(dailyLogEntries)
    .where(and(eq(dailyLogEntries.status, "planned"), lt(dailyLogEntries.date, today)))
    .get();
  return row?.c ?? 0;
}

/** Entries that count toward intake / streak / eaten averages. */
export function isEatenForStats(status: string): boolean {
  return status === "eaten";
}

/** Entries included in forward-looking plan totals (future planned + eaten). */
export function countsTowardPlanTotals(entry: { status: string; date: string }, today = todayString()): boolean {
  if (entry.status === "eaten") return true;
  if (entry.status === "planned" && entry.date >= today) return true;
  return false;
}
