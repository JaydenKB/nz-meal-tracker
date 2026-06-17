"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  appendPantryReviewLines,
  shoppingItemToReviewLine,
} from "@/lib/pantry/review-session";
import { buildShoppingReviewItems } from "@/lib/pantry/shopping-review";

type ShopGroup = {
  store: { name: string } | null;
  items: {
    ingredientId: number;
    ingredientName: string;
    neededDisplay: string;
    productName: string;
    packages: number;
    packageDisplay: string;
    packageSize?: number;
    packageUnit?: string;
  }[];
};

export function RecipeShortfallShopClient({
  recipeName,
  recipeId,
  groups,
}: {
  recipeName: string;
  recipeId: number;
  groups: ShopGroup[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const needItems = useMemo(() => {
    const items: ShopGroup["items"][number][] = [];
    for (const g of groups) {
      for (const item of g.items) {
        if (item.packages > 0) items.push(item);
      }
    }
    return items;
  }, [groups]);

  const hasItems = needItems.length > 0;

  function markAsBought() {
    const selected = needItems.filter((i) => checked[i.ingredientId]);
    if (selected.length === 0) return;

    const lines = buildShoppingReviewItems(
      selected.map((i) => ({
        ingredientId: i.ingredientId,
        ingredientName: i.ingredientName,
        packages: i.packages,
        neededDisplay: i.neededDisplay,
        packageSize: i.packageSize,
        packageUnit: i.packageUnit,
      })),
    ).map((l) => shoppingItemToReviewLine(l));

    appendPantryReviewLines(lines);
    router.push("/shop/pantry/review");
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href={`/recipes/${recipeId}/pantry`}
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">Shopping list</h1>
          <p className="text-sm text-[var(--muted)]">{recipeName} · missing only</p>
        </div>
      </header>

      {!hasItems ? (
        <p className="rounded-[var(--radius-card)] bg-[var(--beige)] px-4 py-6 text-center text-sm text-[var(--muted)]">
          Nothing to buy — you may need to link store products for these ingredients.
        </p>
      ) : (
        groups.map((group, i) => (
          <section key={i}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4 text-[var(--muted)]" />
              {group.store?.name ?? "No store link"}
            </h2>
            <div className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
              {group.items.map((item) => (
                <label
                  key={`${item.ingredientId}-${item.productName}`}
                  className="flex items-start gap-3 px-4 py-3 text-sm"
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
                    className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.ingredientName}</p>
                    <p className="text-[var(--muted)]">
                      Need {item.neededDisplay} · {item.productName} · {item.packages}×{" "}
                      {item.packageDisplay}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ))
      )}

      {hasItems && (
        <Button className="w-full" size="lg" onClick={markAsBought}>
          Mark selected → review &amp; add
        </Button>
      )}

      <Link href="/shop">
        <Button variant="secondary" className="w-full">
          Main shopping list
        </Button>
      </Link>

      <Link href={`/recipes/${recipeId}/cook`}>
        <Button variant="outline" className="w-full">
          Cook anyway
        </Button>
      </Link>
    </div>
  );
}
