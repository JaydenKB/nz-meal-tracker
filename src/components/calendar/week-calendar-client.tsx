"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { CatchUpBanner } from "@/components/log/catch-up-client";
import { MealStatusTag } from "@/components/calendar/meal-status-tag";
import { ProgressStrip } from "@/components/today/progress-strip";
import { Button } from "@/components/ui/button";
import { RecipeIcon } from "@/components/ui/recipe-icon";
import { formatDayHeader, startOfWeek } from "@/lib/calendar/week";
import {
  captureLogRewardContext,
  playRewardsAfterMealLog,
} from "@/lib/sfx/log-rewards";
import { shiftDate, todayString } from "@/lib/log/compute";
import type { LogStatus, MealType } from "@/lib/db/schema";
import { MEAL_ORDER } from "@/lib/log/compute";

type WeekEntry = {
  id: number;
  date: string;
  mealType: MealType;
  status: LogStatus;
  name: string;
  servings: number;
  macros: { calories: number; proteinG: number };
  accentIndex: number;
  entryCost: number | null;
  costPartial: boolean;
  recipeId: number | null;
};

type WeekData = {
  weekStart: string;
  weekLabel: string;
  selectedDate: string;
  today: string;
  days: {
    date: string;
    shortLabel: string;
    dayNumber: string;
    isToday: boolean;
    isSelected: boolean;
  }[];
  entriesByDate: Record<string, WeekEntry[]>;
  macroStats: {
    combined: { avgPerDay: { calories: number; proteinG: number; fatG: number; carbsG: number }; label: string };
    eatenOnly: { avgPerDay: { calories: number; proteinG: number; fatG: number; carbsG: number }; label: string };
  };
  costStats: {
    weekTotal: number | null;
    avgPerMeal: number | null;
    isPartial: boolean;
    label: string;
  };
  plannedCount: number;
};

export function WeekCalendarClient({
  streakDays,
  calorieTarget,
  cookNowCount = 0,
  catchUpCount = 0,
}: {
  streakDays: number;
  calorieTarget: number;
  cookNowCount?: number;
  catchUpCount?: number;
}) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayString()));
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/calendar/week?weekStart=${weekStart}&date=${selectedDate}`,
    );
    setData(await res.json());
    setLoading(false);
  }, [weekStart, selectedDate]);

  useEffect(() => {
    load();
  }, [load]);

  const daysWithEntries = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.entriesByDate)
      .filter(([, entries]) => entries.length > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  async function markEaten(id: number, date: string) {
    setMarkingId(id);
    const before = await captureLogRewardContext(date);
    const res = await fetch(`/api/log/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-eaten" }),
    });
    if (res.ok) {
      await playRewardsAfterMealLog(before, date, "eaten");
    }
    setMarkingId(null);
    load();
    router.refresh();
  }

  function goPrevWeek() {
    setWeekStart(shiftDate(weekStart, -7));
  }

  function goNextWeek() {
    setWeekStart(shiftDate(weekStart, 7));
  }

  function goToday() {
    const today = todayString();
    setWeekStart(startOfWeek(today));
    setSelectedDate(today);
  }

  const eatenTodayCalories =
    data?.entriesByDate[data.today]
      ?.filter((e) => e.status === "eaten")
      .reduce((s, e) => s + e.macros.calories, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[430px] space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-medium text-[var(--foreground)]">This week</h1>
          {data && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{data.weekLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevWeek}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNextWeek}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <Link
            href={`/week/summary?weekStart=${weekStart}`}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white text-[var(--foreground)]"
            aria-label="Week summary"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {data && (
        <ProgressStrip
          streakDays={streakDays}
          consumed={Math.round(eatenTodayCalories)}
          target={calorieTarget}
          remaining={Math.max(0, calorieTarget - Math.round(eatenTodayCalories))}
        />
      )}

      {catchUpCount > 0 && <CatchUpBanner initialCount={catchUpCount} />}

      {cookNowCount > 0 && (
        <Link
          href="/recipes/cook-from-pantry"
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--green-soft)] px-4 py-3"
        >
          <ChefHat className="h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={2} />
          <p className="text-sm font-medium text-[var(--foreground)]">
            You can cook {cookNowCount} recipe{cookNowCount === 1 ? "" : "s"} now
          </p>
        </Link>
      )}

      {data && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {data.days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              className={`flex min-w-[3rem] flex-col items-center rounded-[var(--radius-card)] px-2 py-2 text-center transition-colors ${
                day.isSelected
                  ? "bg-[var(--primary)] text-white"
                  : "border border-[var(--border)] bg-white text-[var(--foreground)]"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">{day.shortLabel}</span>
              <span className="text-base font-medium leading-tight">{day.dayNumber}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={goToday}
            className="shrink-0 self-center rounded-[var(--radius-pill)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]"
          >
            Today
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--green-soft)] px-3.5 py-3">
            <p className="text-xs font-medium text-[var(--primary)]">Avg / day</p>
            <p className="mt-0.5 text-xl font-medium text-[var(--foreground)]">
              {Math.round(data.macroStats.combined.avgPerDay.calories)} kcal
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              P {Math.round(data.macroStats.combined.avgPerDay.proteinG)} · F{" "}
              {Math.round(data.macroStats.combined.avgPerDay.fatG)} · C{" "}
              {Math.round(data.macroStats.combined.avgPerDay.carbsG)}
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted)]">
              {data.macroStats.combined.label}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Eaten only: {Math.round(data.macroStats.eatenOnly.avgPerDay.calories)} kcal/day
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--blue-soft)] px-3.5 py-3">
            <p className="text-xs font-medium text-[#2d6a9f]">Week cost</p>
            <p className="mt-0.5 text-xl font-medium text-[var(--foreground)]">
              {data.costStats.weekTotal != null
                ? `$${data.costStats.weekTotal.toFixed(2)}`
                : "—"}
              {data.costStats.isPartial && data.costStats.weekTotal != null ? "*" : ""}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {data.costStats.avgPerMeal != null
                ? `~$${data.costStats.avgPerMeal.toFixed(2)} / meal`
                : "Link store products for prices"}
            </p>
            {data.costStats.isPartial && (
              <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted)]">
                *Some meals missing price data
              </p>
            )}
          </div>
        </div>
      )}

      <section className="space-y-4">
        {loading || !data ? (
          <p className="text-sm text-[var(--muted)]">Loading week…</p>
        ) : daysWithEntries.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
            No meals this week yet. Add one for any day.
          </p>
        ) : (
          daysWithEntries.map(([date, entries]) => {
            const hasPlanned = entries.some((e) => e.status === "planned");
            const header = formatDayHeader(date);
            return (
              <div key={date}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    {header}
                  </h2>
                  {hasPlanned && (
                    <span className="text-[10px] text-[#534ab7]">· planned</span>
                  )}
                </div>
                <div className="space-y-2">
                  {MEAL_ORDER.flatMap((mt) =>
                    entries
                      .filter((e) => e.mealType === mt)
                      .map((entry) => (
                        <MealEntryRow
                          key={entry.id}
                          entry={entry}
                          marking={markingId === entry.id}
                          onMarkEaten={() => markEaten(entry.id, entry.date)}
                        />
                      )),
                  )}
                  {entries
                    .filter((e) => !MEAL_ORDER.includes(e.mealType))
                    .map((entry) => (
                      <MealEntryRow
                        key={entry.id}
                        entry={entry}
                        marking={markingId === entry.id}
                        onMarkEaten={() => markEaten(entry.id, entry.date)}
                      />
                    ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push(`/log?date=${selectedDate}`)}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Add meal · {selectedDate === todayString() ? "today" : selectedDate}
        </Button>

        {data && data.plannedCount > 0 && (
          <Link href={`/shop/week?weekStart=${weekStart}`} className="block">
            <Button size="lg" variant="outline" className="w-full">
              <ShoppingCart className="h-5 w-5" strokeWidth={2} />
              Shopping list for the week
              <span className="ml-1 text-xs font-normal text-[var(--muted)]">
                ({data.plannedCount} planned)
              </span>
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function MealEntryRow({
  entry,
  marking,
  onMarkEaten,
}: {
  entry: WeekEntry;
  marking: boolean;
  onMarkEaten: () => void;
}) {
  const isPlanned = entry.status === "planned";
  const href = entry.recipeId ? `/recipes/${entry.recipeId}` : undefined;

  const inner = (
    <>
      <RecipeIcon index={entry.accentIndex} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-[var(--foreground)]">{entry.name}</p>
          <MealStatusTag status={entry.status} />
        </div>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {Math.round(entry.macros.calories)} kcal
          {entry.entryCost != null && (
            <>
              {" · "}
              {entry.costPartial ? "~" : ""}${entry.entryCost.toFixed(2)}
            </>
          )}
        </p>
      </div>
    </>
  );

  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--radius-card)] px-3.5 py-3 ${
        isPlanned
          ? "border border-dashed border-[#534ab7]/40 bg-[var(--purple-soft)]/40"
          : "border border-[var(--border)] bg-white"
      }`}
    >
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      {isPlanned && (
        <button
          type="button"
          disabled={marking}
          onClick={onMarkEaten}
          className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--primary)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--primary)] disabled:opacity-50"
        >
          {marking ? "…" : "Mark eaten"}
        </button>
      )}
    </div>
  );
}
