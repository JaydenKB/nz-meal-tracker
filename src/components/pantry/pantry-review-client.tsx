"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChefHat, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PantrySourceChip, PantrySourceSummary } from "@/components/pantry/pantry-source-chip";
import {
  loadPantryReviewSession,
  markPantryReconciled,
  savePantryReviewSession,
  setLastAddHandoff,
  type PantryReviewLine,
} from "@/lib/pantry/review-session";
import { play } from "@/lib/sfx";

type IngredientOption = { id: number; name: string };

export function PantryReviewClient() {
  const router = useRouter();
  const [items, setItems] = useState<PantryReviewLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookBanner, setCookBanner] = useState<number | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [ingredientOptions, setIngredientOptions] = useState<IngredientOption[]>([]);

  useEffect(() => {
    const session = loadPantryReviewSession();
    setItems(session.items);
    if (session.lastCookNowCount != null && session.lastCookNowCount > 0) {
      setCookBanner(session.lastCookNowCount);
    }
  }, []);

  useEffect(() => {
    fetch("/api/ingredients-list")
      .then((r) => r.json())
      .then((data) => setIngredientOptions(data.ingredients ?? []))
      .catch(() => {});
  }, []);

  const persist = useCallback((next: PantryReviewLine[]) => {
    setItems(next);
    savePantryReviewSession({ ...loadPantryReviewSession(), items: next });
  }, []);

  const sourceCounts = useMemo(() => {
    const c: Partial<Record<PantryReviewLine["source"], number>> = {};
    for (const item of items) {
      c[item.source] = (c[item.source] ?? 0) + 1;
    }
    return c;
  }, [items]);

  const confirmable = useMemo(
    () =>
      items.filter(
        (i) =>
          i.confirmed &&
          i.ingredientId != null &&
          i.quantity != null &&
          i.quantity > 0 &&
          !i.needsAction,
      ),
    [items],
  );

  const filteredPicker = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return ingredientOptions.slice(0, 40);
    return ingredientOptions.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 40);
  }, [pickerQuery, ingredientOptions]);

  function updateItem(id: string, patch: Partial<PantryReviewLine>) {
    persist(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    persist(items.filter((i) => i.id !== id));
  }

  function confirmGuess(id: string) {
    persist(
      items.map((item) => {
        if (item.id !== id || !item.bestGuessId) return item;
        return {
          ...item,
          ingredientId: item.bestGuessId,
          name: item.bestGuessName ?? item.name,
          confirmed: true,
          needsAction: item.quantity == null || item.quantity <= 0,
          photoBucket: undefined,
        };
      }),
    );
  }

  function pickIngredient(ing: IngredientOption) {
    if (!pickerFor) return;
    updateItem(pickerFor, {
      ingredientId: ing.id,
      name: ing.name,
      confirmed: true,
      needsAction: false,
    });
    setPickerFor(null);
  }

  async function handleConfirm() {
    if (confirmable.length === 0) {
      setError("Confirm at least one item with a quantity.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/pantry/photo-restock/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: confirmable.map((i) => ({
            clientId: i.id,
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");

      const addedIds = confirmable
        .filter((i) => !data.warnings?.some((w: { clientId?: string }) => w.clientId === i.id))
        .map((i) => i.ingredientId!)
        .filter(Boolean);

      const impactRes = await fetch(
        `/api/pantry/cook-impact?ids=${addedIds.join(",")}`,
      );
      const impact = impactRes.ok ? await impactRes.json() : { count: 0 };

      play("log");
      markPantryReconciled();

      const remaining = items.filter(
        (i) => !confirmable.some((c) => c.id === i.id) || data.warnings?.some((w: { clientId?: string }) => w.clientId === i.id),
      );

      setLastAddHandoff(addedIds, impact.count ?? 0, impact.recipeIds ?? []);
      setCookBanner(impact.count ?? 0);
      persist(remaining);

      if (remaining.length === 0 && (impact.count ?? 0) === 0) {
        router.push("/shop/pantry");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  if (items.length === 0 && cookBanner == null) {
    return (
      <div className="mx-auto max-w-[430px] space-y-5 px-4 py-8">
        <Link href="/shop/pantry/add" className="flex items-center gap-2 text-sm text-[var(--primary)]">
          <ArrowLeft className="h-4 w-4" /> Add to pantry
        </Link>
        <p className="text-[var(--muted)]">Nothing to review — add items from the hub first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-32">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Link
          href="/shop/pantry/add"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Confirm &amp; add</h1>
          <p className="text-sm text-[var(--muted)]">Same review for every method.</p>
        </div>
      </header>

      {items.length > 0 && (
        <div className="px-4">
          <PantrySourceSummary counts={sourceCounts} />
        </div>
      )}

      {cookBanner != null && cookBanner > 0 && (
        <Link
          href={`/recipes/cook-from-pantry?highlight=1`}
          className="mx-4 flex items-center gap-3 rounded-xl border border-[var(--success)]/30 bg-[var(--green-soft)] px-4 py-3"
        >
          <ChefHat className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <p className="text-sm font-medium">
            After adding, see <strong>{cookBanner} new recipe{cookBanner === 1 ? "" : "s"}</strong> you can cook with these
          </p>
        </Link>
      )}

      <div className="space-y-2 px-2">
        {items.map((item) => (
          <ReviewRow
            key={item.id}
            item={item}
            onUpdate={(p) => updateItem(item.id, p)}
            onRemove={() => removeItem(item.id)}
            onConfirmGuess={() => confirmGuess(item.id)}
            onPickOther={() => setPickerFor(item.id)}
          />
        ))}
      </div>

      {error && (
        <p className="mx-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white p-4">
          <div className="mx-auto max-w-[430px]">
            <Button className="w-full" disabled={saving || confirmable.length === 0} onClick={() => void handleConfirm()}>
              {saving ? "Adding…" : `Add ${confirmable.length} to pantry`}
            </Button>
          </div>
        </div>
      )}

      {pickerFor && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Pick ingredient</h3>
              <button type="button" onClick={() => setPickerFor(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                placeholder="Search library…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filteredPicker.map((ing) => (
                <button
                  key={ing.id}
                  type="button"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--beige)]"
                  onClick={() => pickIngredient(ing)}
                >
                  {ing.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  item,
  onUpdate,
  onRemove,
  onConfirmGuess,
  onPickOther,
}: {
  item: PantryReviewLine;
  onUpdate: (p: Partial<PantryReviewLine>) => void;
  onRemove: () => void;
  onConfirmGuess: () => void;
  onPickOther: () => void;
}) {
  const amber = item.needsAction;

  return (
    <div
      className={`rounded-[var(--radius-card)] border p-3 ${
        amber ? "border-[#e8b86d]/50 bg-[#fef9f0]" : "border-[var(--border)] bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        {!item.needsAction && item.ingredientId != null && (
          <button
            type="button"
            onClick={() => onUpdate({ confirmed: !item.confirmed })}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              item.confirmed
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-white"
            }`}
            aria-label={item.confirmed ? "Deselect" : "Select"}
          >
            {item.confirmed && <Check className="h-3 w-3" strokeWidth={3} />}
          </button>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <PantrySourceChip source={item.source} />
                {amber && (
                  <span className="text-[10px] font-semibold uppercase text-[#b45309]">needs action</span>
                )}
              </div>
              <p className="text-sm font-medium">{item.name}</p>
              {item.detectedName && item.detectedName !== item.name && (
                <p className="text-xs text-[var(--muted)]">detected: {item.detectedName}</p>
              )}
              {amber && item.photoBucket === "new" && (
                <p className="text-xs text-[var(--muted)]">no match — scan label to add</p>
              )}
              {amber && item.photoBucket === "not_sure" && item.bestGuessName && (
                <p className="text-xs text-[var(--muted)]">best guess: {item.bestGuessName}</p>
              )}
            </div>
            <button type="button" onClick={onRemove} className="text-[var(--muted)]" aria-label="Remove">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {item.confirmed && item.ingredientId != null && (
            <div className="flex gap-2">
              <Input
                type="number"
                min={0}
                step="any"
                value={item.quantity ?? ""}
                onChange={(e) =>
                  onUpdate({
                    quantity: e.target.value ? Number(e.target.value) : null,
                    needsAction: !e.target.value || Number(e.target.value) <= 0,
                  })
                }
                placeholder="Qty"
                className="h-9 flex-1"
              />
              <Input
                value={item.unit}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                placeholder="Unit"
                className="h-9 w-20"
              />
            </div>
          )}

          {item.warning && <p className="text-xs text-[#b45309]">{item.warning}</p>}

          {item.photoBucket === "not_sure" && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={onConfirmGuess}>
                Yes{item.bestGuessName ? `, ${item.bestGuessName.split(" ")[0]}` : ""}
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={onPickOther}>
                Pick other
              </Button>
            </div>
          )}

          {item.photoBucket === "new" && (
            <Link
              href={`/shop/pantry/restock/create?name=${encodeURIComponent(item.detectedName ?? item.name)}&hub=1`}
            >
              <Button size="sm" variant="ai" className="w-full">
                Scan label to create
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
