"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MacroTiles } from "@/components/recipes/macro-grid";

type ProductRow = {
  id: number;
  productName: string;
  storeName: string;
  priceNzd: number | null;
  packageSize: number;
  packageUnit: string;
  isPreferred: boolean;
};

export function IngredientDetailClient({
  ingredient,
  products,
  pantry,
  weekUsage,
}: {
  ingredient: {
    id: number;
    name: string;
    defaultUnit: string;
    calories: number;
    proteinG: number;
    fatG: number;
    carbsG: number;
    isProcessed: boolean;
  };
  products: ProductRow[];
  pantry: { quantity: number; unit: string } | null;
  weekUsage: { mealCount: number; totalQuantity: number; unit: string; totalCost: number | null };
}) {
  const per100g = {
    calories: ingredient.calories,
    proteinG: ingredient.proteinG,
    fatG: ingredient.fatG,
    carbsG: ingredient.carbsG,
  };

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/ingredients"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">{ingredient.name}</h1>
          <p className="text-sm text-[var(--muted)]">per 100{ingredient.defaultUnit}</p>
        </div>
      </header>

      <MacroTiles perServing={per100g} />

      <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Pantry</p>
        <p className="mt-1 text-base font-medium">
          {pantry ? `${pantry.quantity} ${pantry.unit} on hand` : "Not tracked in pantry"}
        </p>
        <Link href="/shop/pantry" className="mt-2 inline-block text-sm text-[var(--primary)]">
          Manage pantry →
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-base font-medium">This week</h2>
        <p className="text-sm text-[var(--muted)]">
          Used in {weekUsage.mealCount} meal{weekUsage.mealCount === 1 ? "" : "s"} ·{" "}
          {weekUsage.totalQuantity}
          {weekUsage.unit}
          {weekUsage.totalCost != null && ` · ~$${weekUsage.totalCost.toFixed(2)}`}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-medium">Store products</h2>
        {products.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No store links yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
            {products.map((p) => (
              <div key={p.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.productName}</span>
                  {p.isPreferred && (
                    <span className="text-xs text-[var(--primary)]">preferred</span>
                  )}
                </div>
                <p className="text-[var(--muted)]">
                  {p.storeName} · {p.packageSize} {p.packageUnit}
                  {p.priceNzd != null && ` · $${p.priceNzd.toFixed(2)}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
