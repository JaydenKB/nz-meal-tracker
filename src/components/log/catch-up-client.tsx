"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeIcon } from "@/components/ui/recipe-icon";
import { MEAL_LABELS } from "@/lib/log/compute";
import { formatDayHeader } from "@/lib/calendar/week";
import { play } from "@/lib/sfx";
import type { MealType } from "@/lib/db/schema";

const DISMISS_KEY = "catch-up-banner-dismissed";

export function isCatchUpBannerDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === new Date().toLocaleDateString("en-CA");
}

export function dismissCatchUpBannerForSession(): void {
  sessionStorage.setItem(DISMISS_KEY, new Date().toLocaleDateString("en-CA"));
}

type CatchUpEntry = {
  id: number;
  date: string;
  mealType: MealType;
  name: string;
  macros: { calories: number };
  recipeId: number | null;
};

export function CatchUpBanner({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isCatchUpBannerDismissedToday());
  }, []);

  useEffect(() => {
    if (initialCount === 0) return;
    fetch("/api/log/catch-up")
      .then((r) => r.json())
      .then((d) => setCount(d.count ?? 0))
      .catch(() => {});
  }, [initialCount]);

  if (count <= 0 || dismissed) return null;

  return (
    <div className="relative rounded-xl border border-[#534ab7]/25 bg-[var(--ai-soft)] px-4 py-3.5 pr-10">
      <button
        type="button"
        onClick={() => {
          dismissCatchUpBannerForSession();
          setDismissed(true);
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)]"
        aria-label="Dismiss for today"
      >
        <X className="h-4 w-4" />
      </button>
      <Link href="/catch-up" className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[#534ab7]" />
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Catch up your plan</p>
          <p className="text-sm text-[var(--muted)]">
            {count} planned meal{count === 1 ? "" : "s"} have passed — what happened?
          </p>
        </div>
      </Link>
    </div>
  );
}

export function CatchUpClient() {
  const router = useRouter();
  const [entries, setEntries] = useState<CatchUpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [skippingAll, setSkippingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/log/catch-up");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatchUpEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  async function resolve(id: number, action: "ate-it" | "skipped" | "replaced") {
    setBusyId(id);
    const res = await fetch("/api/log/catch-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      if (action === "ate-it") play("log");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    }
    setBusyId(null);
  }

  async function skipAll() {
    setSkippingAll(true);
    const res = await fetch("/api/log/catch-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip-all" }),
    });
    if (res.ok) {
      setEntries([]);
      router.refresh();
    }
    setSkippingAll(false);
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-28">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Catch up your plan</h1>
          <p className="text-sm text-[var(--muted)]">
            {entries.length} planned meal{entries.length === 1 ? "" : "s"} have passed — what happened?
          </p>
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="rounded-xl bg-[var(--green-soft)] px-4 py-6 text-center text-sm text-[var(--primary)]">
          All caught up — nothing overdue.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {grouped.map(([date, dayEntries]) => (
              <section key={date}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  {formatDayHeader(date)}
                </h2>
                <div className="space-y-2">
                  {dayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3.5"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <RecipeIcon index={entry.recipeId ?? entry.id} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[var(--muted)]">{MEAL_LABELS[entry.mealType]}</p>
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-sm text-[var(--muted)]">{Math.round(entry.macros.calories)} kcal</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          className="text-xs"
                          disabled={busyId === entry.id}
                          onClick={() => void resolve(entry.id, "ate-it")}
                        >
                          Ate it
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={busyId === entry.id}
                          onClick={() => void resolve(entry.id, "replaced")}
                        >
                          Ate other
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={busyId === entry.id}
                          onClick={() => void resolve(entry.id, "skipped")}
                        >
                          Skipped
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--beige)] px-4 py-3 text-sm text-[var(--muted)]">
            Until resolved, these don&apos;t count toward your averages or streak. &quot;Ate it&quot; deducts pantry
            &amp; logs it.
          </div>

          <Button variant="outline" className="w-full" disabled={skippingAll} onClick={() => void skipAll()}>
            {skippingAll ? "Skipping…" : "Skip all remaining"}
          </Button>
        </>
      )}
    </div>
  );
}
