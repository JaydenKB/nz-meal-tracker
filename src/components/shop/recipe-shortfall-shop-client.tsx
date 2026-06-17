"use client";

import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type ShopGroup = {
  store: { name: string } | null;
  items: {
    ingredientId: number;
    ingredientName: string;
    neededDisplay: string;
    productName: string;
    packages: number;
    packageDisplay: string;
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
  const hasItems = groups.some((g) => g.items.length > 0);

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
                <div key={`${item.ingredientId}-${item.productName}`} className="px-4 py-3 text-sm">
                  <p className="font-medium">{item.ingredientName}</p>
                  <p className="text-[var(--muted)]">
                    Need {item.neededDisplay} · {item.productName} · {item.packages}×{" "}
                    {item.packageDisplay}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <Link href={`/recipes/${recipeId}/cook`}>
        <Button variant="outline" className="w-full">
          Cook anyway
        </Button>
      </Link>
    </div>
  );
}
