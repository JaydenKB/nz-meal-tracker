"use client";

import Link from "next/link";
import { Camera, ChevronRight, ShoppingBasket, Store } from "lucide-react";
import { TabHeader } from "@/components/layout/tab-header";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";

type ShopItem = {
  ingredientName: string;
  productName: string;
  packages: number;
  lineCost: number | null;
};

type ShopGroup = {
  storeName: string;
  isUnlinked: boolean;
  items: ShopItem[];
  storeTotal: number | null;
};

export function ShopTabClient({
  batchLabel,
  batchId,
  groups,
  grandTotal,
}: {
  batchLabel: string | null;
  batchId: number | null;
  groups: ShopGroup[];
  grandTotal: number | null;
}) {
  return (
    <div className="mx-auto max-w-[430px] space-y-5">
      <TabHeader title="Shop" />

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

      <Link href="/ingredients/import">
        <Button variant="ai" size="lg" className="w-full">
          <Camera className="h-5 w-5" />
          Import from screenshot
        </Button>
      </Link>

      <section>
        <SectionHeader
          title={batchLabel ? `Current list · ${batchLabel}` : "Current list"}
        />

        {groups.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-[var(--muted)]">
            No shopping list yet. Create a batch from a recipe to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.storeName}>
                <div className="mb-2 flex items-center gap-2">
                  <Store
                    className={`h-4 w-4 ${group.isUnlinked ? "text-[var(--streak)]" : "text-[var(--primary)]"}`}
                    strokeWidth={1.75}
                  />
                  <p className="text-sm font-medium text-[var(--foreground)]">{group.storeName}</p>
                </div>
                <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] p-2">
                  {group.items.map((item) => (
                    <label
                      key={`${item.ingredientName}-${item.productName}`}
                      className="flex items-start gap-3 rounded-[var(--radius)] bg-white px-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {item.packages > 0
                            ? `${item.productName} (×${item.packages})`
                            : item.ingredientName}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {grandTotal != null && (
              <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-[var(--blue-soft)] px-4 py-3.5">
                <span className="text-sm font-medium text-[#2d6a9f]">Est. total</span>
                <span className="text-lg font-medium text-[#2d6a9f]">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
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
  );
}
