"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { getRecipeAccent } from "@/lib/theme";

type SummaryData = {
  title: string;
  weekStart: string;
  macroStats: {
    combined: { avgPerDay: { calories: number } };
    eatenOnly: { avgPerDay: { calories: number } };
  };
  costStats: {
    weekTotal: number | null;
    avgPerMeal: number | null;
    isPartial: boolean;
  };
  ingredients: {
    ingredientId: number;
    ingredientName: string;
    mealCount: number;
    totalQuantity: number;
    unit: string;
    totalCost: number | null;
    isPartialCost: boolean;
  }[];
  sort: string;
  costCoverage: {
    isPartial: boolean;
    unpricedIngredients: string[];
    note: string | null;
  };
};

export function WeekSummaryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekStart = searchParams.get("weekStart") ?? "";
  const [sort, setSort] = useState<"frequency" | "cost">("frequency");
  const [data, setData] = useState<SummaryData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/calendar/summary?weekStart=${weekStart}&sort=${sort}`,
    );
    setData(await res.json());
  }, [weekStart, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-medium">Week summary</h1>
          {data && <p className="text-sm text-[var(--muted)]">{data.title}</p>}
        </div>
      </header>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              label="Avg kcal/day"
              value={`${Math.round(data.macroStats.combined.avgPerDay.calories)}`}
              sub="plan + eaten ÷ 7"
              tone="green"
            />
            <StatCard
              label="Avg $/meal"
              value={
                data.costStats.avgPerMeal != null
                  ? `$${data.costStats.avgPerMeal.toFixed(2)}`
                  : "—"
              }
              sub={data.costStats.isPartial ? "partial*" : ""}
              tone="blue"
            />
            <StatCard
              label="Week cost"
              value={
                data.costStats.weekTotal != null
                  ? `$${Math.round(data.costStats.weekTotal)}`
                  : "—"
              }
              sub={`${Math.round(data.macroStats.eatenOnly.avgPerDay.calories)} kcal eaten/day`}
              tone="beige"
            />
          </div>

          {data.costCoverage.note && (
            <p className="text-xs text-[var(--muted)]">{data.costCoverage.note}</p>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Most-used ingredients</h2>
            <div className="flex gap-1">
              <Pill active={sort === "frequency"} onClick={() => setSort("frequency")} className="text-xs">
                Frequency
              </Pill>
              <Pill active={sort === "cost"} onClick={() => setSort("cost")} className="text-xs">
                Cost
              </Pill>
            </div>
          </div>

          {data.ingredients.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No ingredients in meals this week.</p>
          ) : (
            <div className="space-y-2">
              {data.ingredients.map((row, i) => (
                <Link
                  key={row.ingredientId}
                  href={`/ingredients/${row.ingredientId}?weekStart=${data.weekStart}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-lg"
                    style={{ backgroundColor: getRecipeAccent(row.ingredientId + i) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">{row.ingredientName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      used in {row.mealCount} meal{row.mealCount === 1 ? "" : "s"} ·{" "}
                      {formatQty(row.totalQuantity, row.unit)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-[var(--foreground)]">
                    {row.totalCost != null
                      ? `$${row.totalCost.toFixed(2)}`
                      : "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-[var(--muted)]">
            Tap an ingredient for full details.
          </p>

          <Link href={`/shop/week?weekStart=${data.weekStart}`}>
            <Button variant="outline" className="w-full">
              Week shopping list
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "green" | "blue" | "beige";
}) {
  const bg =
    tone === "green"
      ? "bg-[var(--green-soft)]"
      : tone === "blue"
        ? "bg-[var(--blue-soft)]"
        : "bg-[var(--beige)]";

  return (
    <div className={`rounded-[var(--radius-card)] border border-[var(--border)] px-2 py-3 text-center ${bg}`}>
      <p className="text-[10px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-medium">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

function formatQty(amount: number, unit: string): string {
  if (unit === "g" && amount >= 1000) return `${(amount / 1000).toFixed(1)}kg`;
  if (unit === "ml" && amount >= 1000) return `${(amount / 1000).toFixed(1)}L`;
  return `${Math.round(amount * 10) / 10}${unit}`;
}
