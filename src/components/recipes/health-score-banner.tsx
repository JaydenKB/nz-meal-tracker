import type { HealthScoreResult } from "@/lib/nutrition/healthScore";

export function HealthScoreBanner({ result }: { result: HealthScoreResult }) {
  const subtitle = result.summary || result.reasons.slice(0, 2).join(" · ") || "Balanced meal";

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-[var(--green-soft)] px-4 py-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xl font-bold text-white">
        {result.final}
      </div>
      <div>
        <p className="font-semibold text-[var(--foreground)]">Health score</p>
        <p className="text-sm text-[var(--primary)]">{subtitle}</p>
      </div>
    </div>
  );
}
