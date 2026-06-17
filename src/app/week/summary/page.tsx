import { Suspense } from "react";
import { WeekSummaryClient } from "@/components/calendar/week-summary-client";

export default function WeekSummaryPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-[var(--muted)]">Loading…</p>}>
      <WeekSummaryClient />
    </Suspense>
  );
}
