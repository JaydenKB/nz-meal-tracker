"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";

type ShopItem = {
  ingredientId: number;
  ingredientName: string;
  productName: string;
  packages: number;
  lineCost: number | null;
  neededDisplay: string;
};

type ShopGroup = {
  storeName: string;
  isUnlinked: boolean;
  items: ShopItem[];
  storeTotal: number | null;
};

type OwnedItem = {
  ingredientId: number;
  ingredientName: string;
  pantryDisplay: string;
  neededDisplay: string;
};

export function WeekShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekStart = searchParams.get("weekStart") ?? "";
  const [data, setData] = useState<{
    scopeLabel: string;
    mealCount: number;
    costSummary: { grandTotal: number | null; groups: ShopGroup[] };
    shopping: { owned: OwnedItem[]; skippedCount: number };
  } | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/shopping/week?weekStart=${weekStart}&scope=planned`);
    setData(await res.json());
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const needItems = useMemo(() => {
    if (!data) return [];
    const items: (ShopItem & { storeName: string })[] = [];
    for (const g of data.costSummary.groups) {
      for (const item of g.items) {
        if (item.packages > 0) items.push({ ...item, storeName: g.storeName });
      }
    }
    return items;
  }, [data]);

  async function markAsBought() {
    const selected = needItems.filter((i) => checked[i.ingredientId]);
    if (selected.length === 0) return;
    setBuying(true);
    await fetch("/api/pantry/mark-bought", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: selected.map((i) => ({ ingredientId: i.ingredientId, packages: i.packages })),
      }),
    });
    setBuying(false);
    load();
  }

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
          <h1 className="text-xl font-medium">Week shopping</h1>
          {data && (
            <p className="text-sm text-[var(--muted)]">
              {data.scopeLabel} · {data.mealCount} meal{data.mealCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </header>

      {data?.costSummary.grandTotal != null && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--blue-soft)] px-4 py-3">
          <p className="text-xs font-medium text-[#2d6a9f]">Estimated total</p>
          <p className="text-2xl font-medium">${data.costSummary.grandTotal.toFixed(2)}</p>
        </div>
      )}

      {data?.shopping.owned && data.shopping.owned.length > 0 && (
        <section>
          <SectionHeader title={`Already have (${data.shopping.skippedCount})`} />
          <div className="space-y-2">
            {data.shopping.owned.map((o) => (
              <div
                key={o.ingredientId}
                className="flex items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--beige)] px-3.5 py-2.5 text-sm"
              >
                <Package className="h-4 w-4 text-[var(--muted)]" />
                <span className="flex-1">{o.ingredientName}</span>
                <span className="text-[var(--muted)]">{o.pantryDisplay} on hand</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data?.costSummary.groups.map((group) => (
        <section key={group.storeName}>
          <SectionHeader title={group.storeName} />
          <div className="space-y-2">
            {group.items.map((item) =>
              item.packages > 0 ? (
                <label
                  key={`${item.ingredientId}-${item.productName}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.ingredientId])}
                    onChange={() =>
                      setChecked((p) => ({
                        ...p,
                        [item.ingredientId]: !p[item.ingredientId],
                      }))
                    }
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.ingredientName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {item.neededDisplay} · {item.packages}× {item.productName}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {item.lineCost != null ? `$${item.lineCost.toFixed(2)}` : "—"}
                  </span>
                </label>
              ) : null,
            )}
          </div>
        </section>
      ))}

      {needItems.length > 0 && (
        <Button className="w-full" size="lg" disabled={buying} onClick={markAsBought}>
          Mark selected as bought → pantry
        </Button>
      )}

      <Link href="/shop/pantry">
        <Button variant="outline" className="w-full">
          View pantry
        </Button>
      </Link>
    </div>
  );
}
