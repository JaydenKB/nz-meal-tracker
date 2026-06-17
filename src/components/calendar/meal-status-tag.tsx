import { Check, CalendarDays } from "lucide-react";
import type { LogStatus } from "@/lib/db/schema";

export function MealStatusTag({ status }: { status: LogStatus }) {
  if (status === "eaten") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[#639922]/30 bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#639922]">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
        eaten
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
