"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { TabHeader } from "@/components/layout/tab-header";
import { ProgressStrip } from "@/components/today/progress-strip";
import { QuickLogButton } from "@/components/today/quick-log-button";
import { Button } from "@/components/ui/button";
import { RecipeIcon } from "@/components/ui/recipe-icon";
import { SectionHeader } from "@/components/ui/section-header";

type FrequentRecipe = {
  id: number;
  name: string;
  kcal: number;
  proteinG: number;
  accentIndex: number;
};

type LogEntry = {
  id: number;
  name: string;
  macros: { calories: number };
  accentIndex: number;
};

type TodayData = {
  dateLabel: string;
  entries: LogEntry[];
  totals: { calories: number };
  goals: { calorieTarget: number };
  remaining: { calories: number };
};

export function TodayLandingClient({
  streakDays,
  frequentRecipes,
}: {
  streakDays: number;
  frequentRecipes: FrequentRecipe[];
}) {
  const router = useRouter();
  const [data, setData] = useState<TodayData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/log");
    setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dateSubtitle = data?.dateLabel
    ? new Date().toLocaleDateString("en-NZ", {
        weekday: "short",
        day: "numeric",
        month: "long",
      })
    : undefined;

  return (
    <div className="mx-auto max-w-[430px] space-y-6">
      <TabHeader title="Today" subtitle={dateSubtitle} />

      {data && (
        <ProgressStrip
          streakDays={streakDays}
          consumed={Math.round(data.totals.calories)}
          target={data.goals.calorieTarget}
          remaining={data.remaining.calories}
        />
      )}

      <section>
        <SectionHeader title="Log again · one tap" />
        {frequentRecipes.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-6 text-center text-sm text-[var(--muted)]">
            Log a meal once — it&apos;ll show up here for quick re-logging.
          </p>
        ) : (
          <div className="space-y-2">
            {frequentRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
              >
                <RecipeIcon index={recipe.accentIndex} />
                <Link href={`/recipes/${recipe.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--foreground)]">
                    {recipe.name}
                  </p>
                  <p className="text-sm font-normal text-[var(--muted)]">
                    {recipe.kcal} kcal · {recipe.proteinG}g protein
                  </p>
                </Link>
                <QuickLogButton recipeId={recipe.id} onLogged={load} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Today&apos;s meals" />
        {!data || data.entries.length === 0 ? (
          <p className="text-sm font-normal text-[var(--muted)]">Nothing logged yet.</p>
        ) : (
          <div className="space-y-2">
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-white">
                  <div className="h-2.5 w-2.5 rounded-sm bg-[var(--primary)]" />
                </div>
                <p className="min-w-0 flex-1 truncate font-medium text-[var(--foreground)]">
                  {entry.name}
                </p>
                <p className="shrink-0 text-sm font-medium text-[var(--muted)]">
                  {Math.round(entry.macros.calories)} kcal
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => router.push("/log")}
      >
        Log something else
      </Button>
    </div>
  );
}
