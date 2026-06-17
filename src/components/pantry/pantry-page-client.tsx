"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ChefHat, Plus } from "lucide-react";
import { TabHeader } from "@/components/layout/tab-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { getRecipeAccent } from "@/lib/theme";

type PantryItemView = {
  id: number;
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  displayQty: string;
  isStaple: boolean;
  lowThreshold: number | null;
  stockLevel: "low" | "ok";
  barPct: number;
};

export function PantryPageClient({ items }: { items: PantryItemView[] }) {
  const [filter, setFilter] = useState<"all" | "low" | "staples">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [isStaple, setIsStaple] = useState(false);
  const [lowThreshold, setLowThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "low") return items.filter((i) => i.stockLevel === "low");
    if (filter === "staples") return items.filter((i) => i.isStaple);
    return items;
  }, [items, filter]);

  async function handleAdd(mode: "add" | "set") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: Number(ingredientId),
          quantity: Number(quantity),
          unit,
          mode,
          isStaple,
          lowThreshold: lowThreshold ? Number(lowThreshold) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/shop"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
          aria-label="Back to shop"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <TabHeader title="My pantry" subtitle="What you've got at home." />
      </div>

      <Link href="/shop/pantry/add">
        <Button className="w-full">
          <Plus className="h-4 w-4" />
          Add to pantry
        </Button>
      </Link>

      <Link href="/shop/pantry/review">
        <Button variant="secondary" className="w-full">
          Confirm pending items
        </Button>
      </Link>

      <div className="rounded-xl border border-[#e8b86d]/40 bg-[#fef9f0] px-4 py-3 text-sm text-[#92400e]">
        Quantities off after cooking?{" "}
        <Link href="/shop/pantry/restock?hub=1" className="font-medium underline">
          Photo restock
        </Link>{" "}
        to reconcile what&apos;s actually on hand.
      </div>

      <Link href="/recipes/cook-from-pantry">
        <Button variant="secondary" className="w-full">
          <ChefHat className="h-4 w-4" strokeWidth={2} />
          Cook from pantry
        </Button>
      </Link>

      <div className="flex gap-2">
        {(["all", "low", "staples"] as const).map((f) => (
          <Pill
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "all" ? "All" : f === "low" ? "Low" : "Staples"}
          </Pill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
          {items.length === 0
            ? "Pantry empty — add stock or mark shopping items as bought."
            : "Nothing matches this filter."}
        </p>
      ) : (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-2">
          {filtered.map((item, i) => (
            <Link
              key={item.id}
              href={`/shop/pantry/${item.id}`}
              className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-3 hover:bg-[var(--beige)]/50"
            >
              <div
                className="h-10 w-10 shrink-0 rounded-xl"
                style={{ backgroundColor: getRecipeAccent(item.ingredientId + i) }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {item.name}
                  </p>
                  {item.isStaple && (
                    <span className="rounded-full bg-[var(--beige)] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--muted)]">
                      staple
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--beige)]">
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      item.stockLevel === "low" ? "bg-[var(--streak)]" : "bg-[var(--success)]"
                    }`}
                    style={{ width: `${item.barPct}%` }}
                  />
                </div>
              </div>
              <p
                className={`shrink-0 text-sm tabular-nums ${
                  item.stockLevel === "low" ? "font-medium text-[var(--streak)]" : "text-[var(--muted)]"
                }`}
              >
                {item.displayQty}
                {item.stockLevel === "low" ? " · low" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <h3 className="text-lg font-medium">Add stock</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use{" "}
              <Link href="/shop/pantry/add" className="text-[var(--primary)]">
                add to pantry
              </Link>{" "}
              for scan, photo, or library picks, or enter an ID below.{" "}
              <Link href="/ingredients" className="text-[var(--primary)]">
                Browse ingredients
              </Link>
            </p>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="Ingredient ID"
                value={ingredientId}
                onChange={(e) => setIngredientId(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Amount"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Unit (g, ml, each)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-28"
                />
              </div>
              <Input
                placeholder="Low threshold (optional)"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isStaple}
                  onChange={(e) => setIsStaple(e.target.checked)}
                  className="accent-[var(--primary)]"
                />
                Mark as staple
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" disabled={saving} onClick={() => void handleAdd("add")}>
                  {saving ? "Saving…" : "Add to pantry"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
