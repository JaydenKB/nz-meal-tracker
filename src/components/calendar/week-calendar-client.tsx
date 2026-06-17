"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { CatchUpBanner } from "@/components/log/catch-up-client";
import { MealStatusTag } from "@/components/calendar/meal-status-tag";
import { ProgressStrip } from "@/components/today/progress-strip";
import { CountUp } from "@/components/motion/count-up";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { StaggerEntrance } from "@/components/motion/stagger-entrance";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SwipeRow } from "@/components/ui/swipe-row";
import { WeekCalendarSkeleton } from "@/components/ui/skeleton";
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

  async function deleteEntry(id: number) {
    const res = await fetch(`/api/log/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
      router.refresh();
    }
  }

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <PullToRefresh onRefresh={load}>
    <div className="mx-auto max-w-[430px] space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">{greeting} 👋</p>
          <h1 className="text-[1.65rem] font-semibold text-[var(--foreground)]">This week</h1>
          {data && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{data.weekLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrevWeek}
            className="pressable flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNextWeek}
            className="pressable flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <Link
            href={`/week/summary?weekStart=${weekStart}`}
            className="pressable flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
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
          className="pressable flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--green-soft)] px-4 py-3 shadow-[var(--shadow-sm)]"
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
              className={`pressable flex min-w-[3rem] flex-col items-center rounded-[var(--radius-card)] px-2 py-2 text-center transition-colors ${
                day.isSelected
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] [background-image:var(--primary-gradient)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">{day.shortLabel}</span>
              <span className="text-base font-medium leading-tight">{day.dayNumber}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={goToday}
            className="pressable shrink-0 self-center rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--muted)] shadow-[var(--shadow-sm)]"
          >
            Today
          </button>
        </div>
      )}

      {data && !loading && (
        <StaggerEntrance className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--green-soft)] px-3.5 py-3 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-medium text-[var(--primary)]">Avg / day</p>
            <p className="mt-0.5 text-xl font-semibold text-[var(--foreground)]">
              <CountUp
                value={data.macroStats.combined.avgPerDay.calories}
                format={(n) => `${Math.round(n)} kcal`}
              />
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              P{" "}
              <CountUp
                value={data.macroStats.combined.avgPerDay.proteinG}
                format={(n) => String(Math.round(n))}
              />{" "}
              · F{" "}
              <CountUp
                value={data.macroStats.combined.avgPerDay.fatG}
                format={(n) => String(Math.round(n))}
              />{" "}
              · C{" "}
              <CountUp
                value={data.macroStats.combined.avgPerDay.carbsG}
                format={(n) => String(Math.round(n))}
              />
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-[var(--muted)]">
              {data.macroStats.combined.label}
            </p>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              Eaten only:{" "}
              <CountUp
                value={data.macroStats.eatenOnly.avgPerDay.calories}
                format={(n) => `${Math.round(n)} kcal/day`}
              />
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--blue-soft)] px-3.5 py-3 shadow-[var(--shadow-sm)]">
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
        </StaggerEntrance>
      )}

      <section className="space-y-4">
        {loading || !data ? (
          <WeekCalendarSkeleton />
        ) : daysWithEntries.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            iconTone="mint"
            title="Nothing planned yet"
            body="Log what you eat or plan ahead — your week fills in here and shopping lists build themselves."
            actions={[
              {
                label: "Add a meal",
                onClick: () => router.push(`/log?date=${selectedDate}`),
              },
              { label: "Browse recipes", href: "/recipes", variant: "secondary" },
            ]}
          />
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
                          onDelete={() => deleteEntry(entry.id)}
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
                        onDelete={() => deleteEntry(entry.id)}
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
    </PullToRefresh>
  );
}

function MealEntryRow({
  entry,
  marking,
  onMarkEaten,
  onDelete,
}: {
  entry: WeekEntry;
  marking: boolean;
  onMarkEaten: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const isPlanned = entry.status === "planned";
  const href = entry.recipeId ? `/recipes/${entry.recipeId}` : undefined;
  const canSwipe = !isPlanned;

  const content = (
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

  const row = (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 ${
        isPlanned
          ? "border border-dashed border-[#534ab7]/40 bg-[var(--purple-soft)]/40"
          : "border border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {isPlanned && (
        <button
          type="button"
          disabled={marking}
          onClick={onMarkEaten}
          className="pressable shrink-0 rounded-[var(--radius-pill)] border border-[var(--primary)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--primary)] disabled:opacity-50"
        >
          {marking ? "…" : "Mark eaten"}
        </button>
      )}
    </div>
  );

  if (!canSwipe) {
    return (
      <div className="rounded-[var(--radius-card)] shadow-[var(--shadow-sm)]">{row}</div>
    );
  }

  return (
    <SwipeRow
      className="shadow-[var(--shadow-sm)]"
      actions={[
        ...(href
          ? [{ label: "Open", onClick: () => router.push(href), tone: "edit" as const }]
          : []),
        { label: "Delete", onClick: onDelete, tone: "delete" as const },
      ]}
    >
      {row}
    </SwipeRow>
  );
}
