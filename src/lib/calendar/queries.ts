import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyLogEntries } from "@/lib/db/schema";
import type { LogEntryWithMeta } from "@/lib/log/compute";
import { enrichLogEntries } from "@/lib/log/queries";

export async function getLogEntriesForDateRange(
  startDate: string,
  endDate: string,
): Promise<LogEntryWithMeta[]> {
  const rows = await db
    .select()
    .from(dailyLogEntries)
    .where(and(gte(dailyLogEntries.date, startDate), lte(dailyLogEntries.date, endDate)))
    .orderBy(dailyLogEntries.date, dailyLogEntries.loggedAt);

  return enrichLogEntries(rows);
}

export async function getLogEntryById(id: number): Promise<LogEntryWithMeta | null> {
  const row = await db.select().from(dailyLogEntries).where(eq(dailyLogEntries.id, id)).get();
  if (!row) return null;
  const [entry] = await enrichLogEntries([row]);
  return entry ?? null;
}

/** Planned meals only — used for forward-looking week shopping lists. */
export function filterPlannedShoppingEntries(entries: LogEntryWithMeta[]): LogEntryWithMeta[] {
  return entries.filter((e) => e.status === "planned");
}
