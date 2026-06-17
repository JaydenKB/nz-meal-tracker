"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Camera, ChevronRight, Package, Plus, ShoppingBasket, Store } from "lucide-react";
import { TabHeader } from "@/components/layout/tab-header";
import { PullToRefresh } from "@/components/motion/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { toastAction } from "@/lib/rewards/feedback";
import {
  appendPantryReviewLines,
  shoppingItemToReviewLine,
} from "@/lib/pantry/review-session";
import { buildShoppingReviewItems } from "@/lib/pantry/shopping-review";

type ShopItem = {
  ingredientId: number;
  ingredientName: string;
  productName: string;
  packages: number;
  lineCost: number | null;
  packageSize: number;
  packageUnit: string;
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

export function ShopTabClient({
  recipeName,
  batchLabel,
  batchId,
  groups,
  owned,
  skippedCount,
  grandTotal,
}: {
  recipeName: string | null;
  batchLabel: string | null;
  batchId: number | null;
  groups: ShopGroup[];
  owned: OwnedItem[];
  skippedCount: number;
  grandTotal: number | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [reAdded, setReAdded] = useState<Record<number, boolean>>({});

  const needItems = useMemo(() => {
    const items: ShopItem[] = [];
    for (const g of groups) {
      for (const item of g.items) {
        if (item.packages > 0 && !reAdded[item.ingredientId]) {
          items.push(item);
        }
      }
    }
    return items;
  }, [groups, reAdded]);

  const visibleOwned = owned.filter((o) => !reAdded[o.ingredientId]);

  function toggleCheck(ingredientId: number) {
    setChecked((prev) => ({ ...prev, [ingredientId]: !prev[ingredientId] }));
  }

  async function markAsBought() {
    const selected = needItems.filter((i) => checked[i.ingredientId]);
    if (selected.length === 0) {
      toastAction("Select items to add to pantry", "info");
      return;
    }

    const lines = buildShoppingReviewItems(
      selected.map((i) => ({
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        packages: i.packages,
        packageSize: i.packageSize,
        packageUnit: i.packageUnit,
      })),
    ).map((l) => shoppingItemToReviewLine(l));

    appendPantryReviewLines(lines);
    toastAction(`${selected.length} item${selected.length === 1 ? "" : "s"} ready to review`);
    router.push("/shop/pantry/review");
  }

  return (
    <PullToRefresh onRefresh={() => router.refresh()}>
    <div className="mx-auto max-w-[430px] space-y-5 pb-28">
      <TabHeader title="Shop" />

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/shop/pantry">
          <Button className="w-full">
            <Package className="h-4 w-4" />
            My pantry
          </Button>
        </Link>
        <Link href="/shop/pantry/add">
          <Button variant="ai" className="w-full">
            <Plus className="h-4 w-4" />
            Add to pantry
          </Button>
        </Link>
      </div>

      <Link href="/ingredients/import">
        <Button variant="secondary" className="w-full">
          Scan receipt (store prices)
        </Button>
      </Link>

      <div className="grid grid-cols-2 gap-2.5">
        <Link href="/ingredients">
          <Button variant="outline" className="w-full border-[var(--border)] bg-white text-[var(--foreground)]">
            <ShoppingBasket className="h-4 w-4" />
            Ingredients
          </Button>
        </Link>
        <Link href="/stores">
          <Button variant="outline" className="w-full border-[var(--border)] bg-white text-[var(--foreground)]">
            <Store className="h-4 w-4" />
            Stores
          </Button>
        </Link>
      </div>

      <section>
        <SectionHeader
          title={
            recipeName && batchLabel
              ? `${recipeName} · ${batchLabel}`
              : batchLabel ?? "Shopping list"
          }
        />

        {skippedCount > 0 && (
          <div className="mb-3 rounded-[var(--radius-lg)] bg-[var(--mint)] px-4 py-3 text-sm text-[var(--primary-dark)]">
            {skippedCount} item{skippedCount === 1 ? "" : "s"} already in your pantry — skipped
          </div>
        )}

        {groups.length === 0 && visibleOwned.length === 0 ? (
          <EmptyState
            icon={ShoppingBasket}
            iconTone="blue"
            title="No shopping list yet"
            body="Plan meals for the week and we’ll build a store-sorted list from your recipes."
            actions={[
              { label: "Go to Today", href: "/" },
              { label: "Browse recipes", href: "/recipes", variant: "secondary" },
            ]}
            tip="Create a batch from any recipe to generate your first list."
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) =>
              group.items.some((i) => i.packages > 0 && !reAdded[i.ingredientId]) ? (
                <div key={group.storeName}>
                  <div className="mb-2 flex items-center gap-2">
                    <Store
                      className={`h-4 w-4 ${group.isUnlinked ? "text-[var(--streak)]" : "text-[var(--primary)]"}`}
                      strokeWidth={1.75}
                    />
                    <p className="text-sm font-medium text-[var(--foreground)]">{group.storeName}</p>
                  </div>
                  <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] p-2">
                    {group.items
                      .filter((i) => i.packages > 0 && !reAdded[i.ingredientId])
                      .map((item) => (
                        <label
                          key={item.ingredientId}
                          className="flex items-start gap-3 rounded-[var(--radius)] bg-white px-3 py-2.5"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(checked[item.ingredientId])}
                            onChange={() => toggleCheck(item.ingredientId)}
                            className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {item.productName} (×{item.packages})
                            </p>
                            <p className="text-xs text-[var(--muted)]">Need {item.ingredientName}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              ) : null,
            )}

            {visibleOwned.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Already have
                </p>
                <div className="space-y-1 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-3">
                  {visibleOwned.map((item) => (
                    <div
                      key={item.ingredientId}
                      className="flex items-center justify-between gap-2 py-1.5 text-sm"
                    >
                      <span className="text-[var(--muted)] line-through">{item.ingredientName}</span>
                      <span className="shrink-0 text-xs text-[var(--muted)]">
                        {item.pantryDisplay} in pantry
                      </span>
                      <button
                        type="button"
                        onClick={() => setReAdded((p) => ({ ...p, [item.ingredientId]: true }))}
                        className="text-xs font-medium text-[var(--primary)]"
                      >
                        Re-add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grandTotal != null && needItems.length > 0 && (
              <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-[var(--blue-soft)] px-4 py-3.5">
                <span className="text-sm font-medium text-[#2d6a9f]">Est. total</span>
                <span className="text-lg font-medium text-[#2d6a9f]">${grandTotal.toFixed(2)}</span>
              </div>
            )}

            {needItems.length > 0 && (
              <Button size="lg" className="w-full" onClick={() => void markAsBought()}>
                Mark selected → review & add
              </Button>
            )}

            {batchId && (
              <Link
                href={`/batches/${batchId}`}
                className="flex items-center justify-center gap-1 text-sm font-medium text-[var(--primary)]"
              >
                View full list
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
    </PullToRefresh>
  );
}
