import type { LogStatus } from "@/lib/db/schema";
import { Check, CalendarDays, Ban, RefreshCw } from "lucide-react";

export function MealStatusTag({ status }: { status: LogStatus }) {
  if (status === "eaten") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[#639922]/30 bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#639922]">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        eaten
      </span>
    );
  }

  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--beige)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <Ban className="h-3 w-3" strokeWidth={2} aria-hidden />
        skipped
      </span>
    );
  }

  if (status === "replaced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--beige)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <RefreshCw className="h-3 w-3" strokeWidth={2} aria-hidden />
        replaced
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[#534ab7]/30 bg-[var(--purple-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#534ab7]">
      <CalendarDays className="h-3 w-3" strokeWidth={2} aria-hidden />
      planned
    </span>
  );
}
