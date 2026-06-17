"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChefHat, Cpu, Plus, Sparkles, X } from "lucide-react";
import { HealthScoreBadge } from "@/components/recipes/health-score-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RECIPE_GOALS,
  SURPRISE_FOCUSES,
  goalSummary,
  surpriseSummary,
  type GenerateMode,
  type RecipeGoal,
  type SurpriseFocus,
} from "@/lib/generation/goals";
import type { VerifiedRecipe } from "@/lib/generation/verify";
import { stripStepNumber } from "@/lib/recipes/format-method";

type IngredientOption = { id: number; name: string };

const DEFAULT_NAMES = ["chicken breast", "brown rice", "broccoli", "quinoa", "spinach"];

export function GeneratePageClient({
  initialSelectedIds,
}: {
  initialSelectedIds?: number[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<GenerateMode>("pick");
  const [allIngredients, setAllIngredients] = useState<IngredientOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [goal, setGoal] = useState<RecipeGoal>("high_protein");
  const [surpriseFocus, setSurpriseFocus] = useState<SurpriseFocus>("healthy");
  const [calorieTarget, setCalorieTarget] = useState("600");
  const [keywords, setKeywords] = useState("");
  const [count] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VerifiedRecipe[] | null>(null);
  const [summary, setSummary] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("/api/ingredients-list")
      .then((r) => r.json())
      .then((data) => {
        const list: IngredientOption[] = data.ingredients ?? [];
        setAllIngredients(list);
        if (initialSelectedIds?.length) {
          const valid = initialSelectedIds.filter((id) => list.some((i) => i.id === id));
          setSelectedIds(valid.length > 0 ? valid : list.slice(0, 3).map((i) => i.id));
          return;
        }
        const defaults = list
          .filter((i) =>
            DEFAULT_NAMES.some((n) => i.name.toLowerCase().includes(n)),
          )
          .slice(0, 3)
          .map((i) => i.id);
        setSelectedIds(defaults.length > 0 ? defaults : list.slice(0, 3).map((i) => i.id));
      });
  }, [initialSelectedIds]);

  const selectedIngredients = allIngredients.filter((i) => selectedIds.includes(i.id));
  const availableToAdd = allIngredients.filter((i) => !selectedIds.includes(i.id));

  const removeIngredient = (id: number) => {
    setSelectedIds((ids) => ids.filter((x) => x !== id));
  };

  const addIngredient = (id: number) => {
    setSelectedIds((ids) => [...ids, id]);
    setShowPicker(false);
  };

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setExpanded(null);
    setSavedIds({});

    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          ingredientIds: mode === "pick" ? selectedIds : undefined,
          goal: mode === "pick" ? goal : undefined,
          surpriseFocus: mode === "surprise" ? surpriseFocus : undefined,
          targetCaloriesPerServing: calorieTarget ? Number(calorieTarget) : undefined,
          keywords: keywords.trim() || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");

      setResults(data.recipes ?? []);
      setSummary(
        data.summary ??
          (mode === "surprise"
            ? surpriseSummary(surpriseFocus, Number(calorieTarget) || undefined)
            : goalSummary(goal, Number(calorieTarget) || undefined)),
      );

      if (data.filteredOut > 0 && (data.recipes?.length ?? 0) === 0) {
        setError(
          `${data.filteredOut} recipe(s) filtered — try different ingredients or a wider calorie target.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [mode, selectedIds, goal, surpriseFocus, calorieTarget, keywords, count]);

  async function saveRecipe(recipe: VerifiedRecipe, index: number) {
    setSaving(index);
    setError(null);
    try {
      const res = await fetch("/api/recipes/save-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSavedIds((prev) => ({ ...prev, [index]: data.id }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  if (results) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[1.65rem] font-bold">{results.length} suggestions</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{summary}</p>
        </div>

        {error && (
          <p className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-3 text-sm text-[#c47a2c]">
            {error}
          </p>
        )}

        {results.length === 0 ? (
          <Button
            className="w-full"
            onClick={() => {
              setResults(null);
              setError(null);
            }}
          >
            Adjust & try again
          </Button>
        ) : (
          results.map((recipe, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold leading-snug">{recipe.name}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{recipe.coverageNote}</p>
                  <p className="mt-1 text-sm">
                    {Math.round(recipe.perServing.calories)} kcal ·{" "}
                    {Math.round(recipe.perServing.proteinG)}g protein ·{" "}
                    {Math.round(recipe.perServing.carbsG)}g carbs
                  </p>
                  {recipe.flagged && recipe.flagReason && (
                    <p className="mt-1 text-xs text-[#c47a2c]">{recipe.flagReason}</p>
                  )}
                </div>
                <HealthScoreBadge score={recipe.healthScore} size="sm" />
              </div>

              {expanded === index && (
                <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-sm">
                  <div>
                    <p className="mb-2 font-medium">Ingredients</p>
                    <ul className="space-y-1 text-[var(--muted)]">
                      {recipe.lines.map((l, i) => (
                        <li key={i}>
                          {l.name} — {l.amount} {l.unit}
                          {!l.matched && " (needs adding)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {recipe.method.length > 0 && (
                    <div>
                      <p className="mb-2 font-medium">Method</p>
                      <ol className="list-decimal space-y-2 pl-4 text-[var(--muted)]">
                        {recipe.method.map((step, i) => (
                          <li key={i}>{stripStepNumber(step)}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {savedIds[index] ? (
                  <>
                    <Button className="flex-1" variant="secondary" disabled>
                      Saved ✓
                    </Button>
                    <Button
                      variant="secondary"
                      className="shrink-0 px-4"
                      onClick={() => router.push(`/recipes/${savedIds[index]}`)}
                    >
                      Open
                    </Button>
                  </>
                ) : (
                  <Button
                    className="flex-1"
                    disabled={saving === index}
                    onClick={() => saveRecipe(recipe, index)}
                  >
                    {saving === index ? "Saving…" : "Save"}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setExpanded(expanded === index ? null : index)}
                >
                  {expanded === index ? "Hide" : "View"}
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setResults(null);
              setError(null);
            }}
          >
            ← Back
          </Button>
          <Button className="flex-1" onClick={generate} disabled={loading}>
            Regenerate
          </Button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
          <Cpu className="h-3.5 w-3.5" />
          Macros always verified by app — never from the model
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/recipes"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white text-[var(--foreground)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[1.75rem] font-medium text-[var(--foreground)]">Generate recipes</h1>
      </header>

      <section className="space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("pick")}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "pick"
                ? "bg-[var(--mint)] ring-2 ring-[var(--primary)]"
                : "bg-[var(--beige)] text-[var(--muted)]"
            }`}
          >
            Pick ingredients
          </button>
          <button
            type="button"
            onClick={() => setMode("surprise")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === "surprise"
                ? "bg-[#ede7f6] ring-2 ring-[#b39ddb]"
                : "bg-[var(--beige)] text-[var(--muted)]"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Surprise me
          </button>
        </div>
      </section>

      {mode === "pick" ? (
        <>
          <section className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">Build around</p>
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ing) => (
                <span
                  key={ing.id}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--mint)] px-3 py-1.5 text-sm font-medium text-[var(--primary)]"
                >
                  {ing.name}
                  <button
                    type="button"
                    onClick={() => removeIngredient(ing.id)}
                    aria-label={`Remove ${ing.name}`}
                  >
                    <X className="h-3.5 w-3.5 text-[var(--muted)]" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)]"
              >
                <Plus className="h-3.5 w-3.5" />
                add
              </button>
            </div>
            {showPicker && availableToAdd.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] p-3">
                {availableToAdd.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => addIngredient(ing.id)}
                    className="rounded-full bg-[var(--green-soft)] px-3 py-1 text-sm"
                  >
                    {ing.name}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">Goal</p>
            <div className="flex flex-wrap gap-2">
              {RECIPE_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id)}
                  className={`rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium transition-colors ${
                    goal === g.id
                      ? "bg-[var(--ai-soft)] text-[var(--ai)] ring-2 ring-[var(--ai)]/30"
                      : "bg-[var(--beige)] text-[var(--muted)]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-2">
          <p className="text-sm font-semibold">Focus</p>
          <p className="text-xs text-[var(--muted)]">
            AI picks from all {allIngredients.length} ingredients in your library — it
            chooses what to use and what to skip.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SURPRISE_FOCUSES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSurpriseFocus(f.id)}
                className={`rounded-[var(--radius-lg)] px-3 py-3 text-left text-sm transition-colors ${
                  surpriseFocus === f.id
                    ? "bg-[#ede7f6] ring-2 ring-[#b39ddb]"
                    : "bg-[var(--beige)]"
                }`}
              >
                <span className="font-medium">{f.label}</span>
                <span className="mt-0.5 block text-xs text-[var(--muted)]">{f.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-sm font-semibold">Calorie target / serving</p>
        <p className="text-xs text-[var(--muted)]">
          The AI sizes portions to land near this — not a strict cap. Satisfying meals, not diet
          food.
        </p>
        <Input
          type="number"
          min={200}
          max={1500}
          value={calorieTarget}
          onChange={(e) => setCalorieTarget(e.target.value)}
          placeholder="600"
        />
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold">Style keywords</p>
        <p className="text-xs text-[var(--muted)]">
          Guide the AI — meal type, format, or vibe. Comma-separated.
        </p>
        <Input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="e.g. breakfast, pasta, spicy, quick"
        />
      </section>

      {error && (
        <p className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-3 text-sm text-[#c47a2c]">
          {error}
        </p>
      )}

      <Button
        variant="ai"
        size="lg"
        className="w-full"
        disabled={
          loading ||
          allIngredients.length === 0 ||
          (mode === "pick" && selectedIds.length === 0)
        }
        onClick={generate}
      >
        {mode === "surprise" ? (
          <Sparkles className="h-5 w-5" />
        ) : (
          <ChefHat className="h-5 w-5" />
        )}
        {loading
          ? "Generating…"
          : mode === "surprise"
            ? `Surprise me · ${count} recipes`
            : `Generate ${count} recipes`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--muted)]">
        <Cpu className="h-3.5 w-3.5" />
        Macros always verified by app — never from the model
      </p>
    </div>
  );
}
