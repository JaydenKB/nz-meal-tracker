"use client";

import Link from "next/link";
import { ChevronRight, Lightbulb } from "lucide-react";
import { HealthScoreBadge } from "@/components/recipes/health-score-badge";
import type { HealthScoreResult } from "@/lib/nutrition/healthScore";

function ScoreBar({
  label,
  points,
  maxPoints,
}: {
  label: string;
  points: number;
  maxPoints: number;
}) {
  const ratio = maxPoints > 0 ? points / maxPoints : 0;
  const barColor =
    ratio >= 0.72 ? "bg-[var(--success)]" : ratio >= 0.45 ? "bg-[var(--streak)]" : "bg-[var(--streak)]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-[var(--foreground)]">{label}</span>
        <span className="shrink-0 text-[var(--muted)]">
          {Math.round(points)} / {maxPoints}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--beige)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function HealthScoreBreakdownClient({
  recipeId,
  recipeName,
  healthScore,
}: {
  recipeId: number;
  recipeName: string;
  healthScore: HealthScoreResult;
}) {
  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--green-soft)] px-4 py-4">
        <div className="flex items-center gap-4">
          <HealthScoreBadge score={healthScore.final} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium text-[var(--foreground)]">{recipeName}</h1>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{healthScore.summary}</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium text-[var(--foreground)]">What built the score</h2>
        <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-4">
          {healthScore.components.map((c) => (
            <div key={c.key}>
              <ScoreBar label={c.label} points={c.points} maxPoints={c.maxPoints} />
              {c.note && (
                <p className="mt-1 text-xs text-[var(--muted)]">{c.note}</p>
              )}
            </div>
          ))}
          <p className="border-t border-[var(--border)] pt-3 text-sm font-medium text-[var(--foreground)]">
            Base score: {healthScore.base} / 100
          </p>
        </div>
      </section>

      {healthScore.penalties.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-medium text-[var(--foreground)]">Penalties applied</h2>
          <div className="divide-y divide-red-100 rounded-[var(--radius-card)] border border-red-100 bg-red-50/60">
            {healthScore.penalties.map((p) => (
              <div
                key={`${p.key}-${p.label}`}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{p.label}</p>
                  {p.note && <p className="text-xs text-[var(--muted)]">{p.note}</p>}
                </div>
                <span className="font-medium text-red-600">−{p.points}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {healthScore.improveHint && (
        <Link
          href={`/recipes/${recipeId}/suggestions`}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--purple-soft)] px-4 py-3.5"
        >
          <Lightbulb className="h-5 w-5 shrink-0 text-[var(--ai)]" strokeWidth={2} />
          <span className="flex-1 text-sm font-medium text-[var(--foreground)]">
            {healthScore.improveHint.message}
          </span>
          <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
        </Link>
      )}

      <Link
        href={`/recipes/${recipeId}/score/methodology`}
        className="block text-center text-sm font-medium text-[var(--primary)]"
      >
        How the score combines →
      </Link>
    </div>
  );
}
