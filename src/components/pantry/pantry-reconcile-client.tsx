"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRecipeAccent } from "@/lib/theme";
import { play } from "@/lib/sfx";
import { formatReconcileAgo } from "@/lib/pantry/reconcile";

const DISMISS_KEY = "pantry-reconcile-dismissed";

export function isReconcileBannerDismissedToday(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === new Date().toLocaleDateString("en-CA");
}

export function dismissReconcileBannerForSession(): void {
  sessionStorage.setItem(DISMISS_KEY, new Date().toLocaleDateString("en-CA"));
}

type ReconcileItem = {
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  displayQty: string;
  likelyWrong: boolean;
  likelyWrongReason?: string;
  ingredient?: { defaultUnit: string };
};

type Drift = {
  needsCheck: boolean;
  lastReconciledAt: string | null;
  daysSinceReconcile: number | null;
  deductionsSinceReconcile: number;
  mealsCookedSinceReconcile: number;
};

export function PantryReconcileBanner({
  drift,
}: {
  drift: { needsCheck: boolean; lastReconciledAt: string | null; mealsCookedSinceReconcile: number };
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isReconcileBannerDismissedToday());
  }, []);

  if (!drift.needsCheck || dismissed) return null;

  return (
    <div className="relative rounded-xl border border-[#e8b86d]/40 bg-[#fef9f0] px-4 py-3.5 pr-10">
      <button
        type="button"
        onClick={() => {
          dismissReconcileBannerForSession();
          setDismissed(true);
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)]"
        aria-label="Dismiss for today"
      >
        <X className="h-4 w-4" />
      </button>
      <Link href="/shop/pantry/reconcile">
        <p className="text-sm font-medium text-[#92400e]">Quick stock check?</p>
        <p className="text-sm text-[var(--muted)]">
          Last checked {formatReconcileAgo(drift.lastReconciledAt)} · {drift.mealsCookedSinceReconcile} meals
          cooked since
        </p>
      </Link>
    </div>
  );
}

type EditableItem = ReconcileItem & { editQty: number; editUnit: string };

export function PantryReconcileClient() {
  const router = useRouter();
  const [drift, setDrift] = useState<Drift | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pantry/reconcile?all=${showAll ? "1" : "0"}`);
    const data = await res.json();
    setDrift(data.drift);
    setTotalCount(data.totalPantryCount ?? 0);
    setItems(
      (data.items ?? []).map((i: ReconcileItem) => {
        const display = i.displayQty.match(/^([\d.]+)\s*(\S+)/);
        return {
          ...i,
          editQty: display ? Number(display[1]) : i.quantity,
          editUnit: display ? display[2] : i.unit,
        };
      }),
    );
    setLoading(false);
  }, [showAll]);

  useEffect(() => {
    load();
  }, [load]);

  function adjustQty(ingredientId: number, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.ingredientId === ingredientId
          ? { ...i, editQty: Math.max(0, Math.round((i.editQty + delta) * 10) / 10) }
          : i,
      ),
    );
  }

  async function confirmAll() {
    setSaving(true);
    const res = await fetch("/api/pantry/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm-all" }),
    });
    if (res.ok) {
      play("log");
      router.push("/shop/pantry");
      router.refresh();
    }
    setSaving(false);
  }

  async function saveChanges() {
    setSaving(true);
    const corrections = items
      .filter((i) => {
        const orig = i.displayQty.match(/^([\d.]+)\s*(\S+)/);
        const origQty = orig ? Number(orig[1]) : i.quantity;
        const origUnit = orig ? orig[2] : i.unit;
        return i.editQty !== origQty || i.editUnit !== origUnit;
      })
      .map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.editQty,
        unit: i.editUnit,
      }));

    const res = await fetch("/api/pantry/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", corrections }),
    });
    if (res.ok) {
      play("log");
      router.push("/shop/pantry");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-32">
      <header className="flex items-center gap-3">
        <Link
          href="/shop/pantry"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Quick stock check</h1>
          <p className="text-sm text-[var(--muted)]">Confirm what&apos;s actually in your kitchen.</p>
        </div>
      </header>

      {drift && (
        <div className="rounded-xl border border-[#e8b86d]/40 bg-[#fef9f0] px-4 py-3 text-sm text-[#92400e]">
          Last checked {formatReconcileAgo(drift.lastReconciledAt)} · {drift.mealsCookedSinceReconcile} meals
          cooked since
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              We think you have
            </h2>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.ingredientId}
                  className={`flex items-center gap-3 rounded-[var(--radius-card)] border p-3.5 ${
                    item.likelyWrong
                      ? "border-[#e8b86d]/50 bg-[#fef9f0]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-medium"
                    style={{ backgroundColor: getRecipeAccent(idx) }}
                  >
                    {item.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.name}</p>
                    {item.likelyWrong && item.likelyWrongReason && (
                      <p className="text-xs text-[#b45309]">{item.likelyWrongReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)]"
                      onClick={() => adjustQty(item.ingredientId, -item.editQty >= 50 ? 50 : 10)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[4rem] text-center text-sm tabular-nums">
                      {item.editQty}
                      {item.editUnit}
                    </span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)]"
                      onClick={() => adjustQty(item.ingredientId, item.editQty >= 50 ? 50 : 10)}
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {!showAll && totalCount > items.length && (
            <Button variant="secondary" className="w-full" onClick={() => setShowAll(true)}>
              Show all ({totalCount} items)
            </Button>
          )}

          <p className="text-center text-xs text-[var(--muted)]">
            Only staples &amp; recently-cooked items shown — not everything.
          </p>

          <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white p-4">
            <div className="mx-auto flex max-w-[430px] gap-2">
              <Button variant="outline" className="flex-1" disabled={saving} onClick={() => void confirmAll()}>
                Looks right
              </Button>
              <Button className="flex-1" disabled={saving} onClick={() => void saveChanges()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
