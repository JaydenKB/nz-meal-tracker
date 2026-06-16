"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatScoreDelta } from "@/lib/suggestions/simulate";

type MacroDelta = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

type Suggestion = {
  change: string;
  reason: string;
  score_delta: number;
  computed_delta?: number;
  macro_delta?: MacroDelta;
  macro_summary?: string;
  action?: string;
  ingredient_id?: number;
  new_ingredient_id?: number;
  quantity?: number;
  unit?: string;
};

export function SuggestionsClient({
  recipeId,
  recipeName,
  currentScore,
}: {
  recipeId: number;
  recipeName: string;
  currentScore: number;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [projectedScore, setProjectedScore] = useState(currentScore);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/suggestions`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load suggestions");
      setSuggestions(data.suggestions ?? []);
      setProjectedScore(data.projectedScore ?? currentScore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load suggestions");
    } finally {
      setLoading(false);
    }
  }, [recipeId, currentScore]);

  useEffect(() => {
    load();
  }, [load]);

  async function apply(index?: number) {
    setApplying(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apply: index != null,
          applyAll: index == null,
          suggestionIndex: index,
          suggestions,
        }),
      });
      if (!res.ok) throw new Error("Apply failed");
      window.location.href = `/recipes/${recipeId}`;
    } catch {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/recipes/${recipeId}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Health suggestions</h1>
          <p className="text-sm text-[var(--muted)]">
            {recipeName} · score {currentScore}
          </p>
        </div>
      </div>

      {loading && (
        <p className="rounded-[var(--radius-lg)] bg-[#ede7f6] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Analysing recipe…
        </p>
      )}

      {error && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-4 text-sm">
          <p className="font-medium text-[#c47a2c]">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="space-y-3">
            {suggestions.map((s, i) => {
              const delta = s.computed_delta ?? s.score_delta;
              const scoreUp = delta > 0;
              const scoreDown = delta < 0;

              return (
                <div
                  key={i}
                  className="rounded-[var(--radius-lg)] bg-[#ede7f6] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.change}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{s.reason}</p>
                      {s.macro_summary && (
                        <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                          {s.macro_summary}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${
                        scoreUp
                          ? "bg-[var(--success)]"
                          : scoreDown
                            ? "bg-[#c47a2c]"
                            : "bg-[var(--muted)]"
                      }`}
                    >
                      {formatScoreDelta(delta)} score
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    disabled={applying}
                    onClick={() => apply(i)}
                  >
                    Apply
                  </Button>
                </div>
              );
            })}
          </div>

          {suggestions.length > 0 && (
            <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--green-soft)] px-4 py-4">
              <div>
                <p className="text-sm font-medium text-[var(--muted)]">Projected score</p>
                <p className="text-2xl font-bold text-[var(--primary)]">
                  {currentScore} → {projectedScore}
                </p>
              </div>
              <Button disabled={applying} onClick={() => apply()}>
                Apply all
              </Button>
            </div>
          )}

          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
            <Cpu className="h-3.5 w-3.5" />
            Macro changes calculated from your ingredient database
          </p>
        </>
      )}
    </div>
  );
}
