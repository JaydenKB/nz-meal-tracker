"use client";

import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HEALTH_SCORE_COMPONENT_LABELS,
  HEALTH_SCORE_COMPONENT_MAX,
  MEAL_CAL_BANDS,
  PENALTY_RULES,
} from "@/lib/nutrition/healthScore.config";

export function HealthScoreMethodologyClient({ recipeId }: { recipeId: number }) {
  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href={`/recipes/${recipeId}/score`}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">How the score combines</h1>
          <p className="text-sm text-[var(--muted)]">Base nutrition, then penalties cap it</p>
        </div>
      </header>

      <div className="space-y-2">
        <FlowBox
          tone="green"
          title={`Up to 100 base`}
          body="Sum of the 5 positive components (protein density, nutrient per calorie, whole-food ratio, macro balance, micronutrients)."
        />
        <div className="flex justify-center text-[var(--muted)]">↓</div>
        <FlowBox
          tone="red"
          title="− penalties"
          body="Sodium, saturated fat, and added sugar are subtracted after the base — a strength can't hide a serious problem."
        />
        <div className="flex justify-center text-[var(--muted)]">↓</div>
        <FlowBox
          tone="primary"
          title="Final score"
          body="Base minus penalties, clamped 0–100. Very high sodium can cap the final score regardless of protein."
        />
      </div>

      <div className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--orange-soft)] px-4 py-3.5">
        <Scale className="h-5 w-5 shrink-0 text-[var(--streak)]" strokeWidth={2} />
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          Calorie checks are <strong>portion-aware</strong> (snacks vs dinners use different bands).
          Nutrient-dense whole foods like salmon, nuts, and olive oil are{" "}
          <strong>not</strong> penalised for being calorie-dense — empty calories are.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-base font-medium">Scoring weights</h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white divide-y divide-[var(--border)]">
          {(
            Object.keys(HEALTH_SCORE_COMPONENT_MAX) as (keyof typeof HEALTH_SCORE_COMPONENT_MAX)[]
          ).map((key) => (
            <div key={key} className="flex justify-between px-4 py-2.5 text-sm">
              <span>{HEALTH_SCORE_COMPONENT_LABELS[key]}</span>
              <span className="text-[var(--muted)]">max {HEALTH_SCORE_COMPONENT_MAX[key]} pts</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-medium">Portion bands (per serving)</h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white divide-y divide-[var(--border)] text-sm">
          {(Object.keys(MEAL_CAL_BANDS) as (keyof typeof MEAL_CAL_BANDS)[])
            .filter((k) => k !== "default")
            .map((key) => {
              const band = MEAL_CAL_BANDS[key];
              return (
                <div key={key} className="flex justify-between px-4 py-2.5 capitalize">
                  <span>{band.label}</span>
                  <span className="text-[var(--muted)]">
                    {band.min}–{band.max} kcal (ideal ~{band.ideal})
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      <details className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
          Penalty thresholds
        </summary>
        <div className="mt-3 space-y-2 text-xs text-[var(--muted)]">
          <p>Sodium: &gt;{PENALTY_RULES.sodium[2].above} mg → −{PENALTY_RULES.sodium[2].points} pts, &gt;{PENALTY_RULES.sodium[1].above} → −{PENALTY_RULES.sodium[1].points}, &gt;{PENALTY_RULES.sodium[0].above} → −{PENALTY_RULES.sodium[0].points}</p>
          <p>Saturated fat and sugar use similar tiered cutoffs per serving.</p>
        </div>
      </details>

      <Link href={`/recipes/${recipeId}/score`}>
        <Button variant="outline" className="w-full">
          Back to breakdown
        </Button>
      </Link>
    </div>
  );
}

function FlowBox({
  tone,
  title,
  body,
}: {
  tone: "green" | "red" | "primary";
  title: string;
  body: string;
}) {
  const bg =
    tone === "green"
      ? "bg-[var(--green-soft)]"
      : tone === "red"
        ? "bg-red-50"
        : "bg-[var(--mint)]";
  const titleColor =
    tone === "green"
      ? "text-[var(--primary)]"
      : tone === "red"
        ? "text-red-700"
        : "text-[var(--primary-dark)]";

  return (
    <div className={`rounded-[var(--radius-card)] border border-[var(--border)] px-4 py-3.5 ${bg}`}>
      <p className={`font-medium ${titleColor}`}>{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}
