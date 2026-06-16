import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";
import { PrintButton } from "@/components/ui/print-button";
import { SoftPanel } from "@/components/ui/card";
import { getBatchWithShoppingList } from "@/lib/queries";

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getBatchWithShoppingList(Number(id));

  if (!data) notFound();

  const { batch, recipe, costSummary } = data;

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-4 print:space-y-4">
      <header className="flex items-center gap-3">
        <Link
          href="/shop"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-[1.75rem] font-medium">Shopping list</h1>
          <p className="text-sm text-[var(--muted)]">
            {recipe.name} · {batch.multiplier}× batch
          </p>
        </div>
      </header>

      {costSummary.groups.map((group) => (
        <section key={group.storeName} className="space-y-2">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${
                group.isUnlinked ? "text-[#c47a2c]" : "text-[var(--foreground)]"
              }`}
            >
              {group.isUnlinked ? (
                <Square className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <CheckSquare className="h-4 w-4 text-[var(--primary)]" strokeWidth={1.75} />
              )}
              {group.storeName}
            </div>
            {group.storeTotal != null && (
              <span className="text-sm font-semibold text-[var(--primary)]">
                ${group.storeTotal.toFixed(2)}
              </span>
            )}
          </div>

          <SoftPanel tone={group.isUnlinked ? "orange" : "beige"} className="space-y-0 divide-y divide-black/5">
            {group.items.map((item) => (
              <div
                key={`${item.ingredientId}-${item.productName}`}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-2.5">
                  <Square className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium">
                      {item.packages > 0
                        ? `${item.productName} (×${item.packages})`
                        : item.ingredientName}
                    </p>
                    {item.packages > 0 && (
                      <p className="text-xs text-[var(--muted)]">
                        Need ~{item.neededDisplay}
                        {item.noPrice && " · no price"}
                        {item.lineCost != null && ` · $${item.lineCost.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                </div>
                {group.isUnlinked && (
                  <Link
                    href="/stores"
                    className="shrink-0 text-xs font-medium text-[#c47a2c]"
                  >
                    add link →
                  </Link>
                )}
              </div>
            ))}
          </SoftPanel>
        </section>
      ))}

      {costSummary.grandTotal != null && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--blue-soft)] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#2d6a9f]">Est. total</span>
            <span className="text-lg font-bold text-[#2d6a9f]">
              ${costSummary.grandTotal.toFixed(2)}
            </span>
          </div>
          {costSummary.pricedItemCount < costSummary.totalItemCount && (
            <p className="mt-1 text-xs text-[#2d6a9f]/80">
              Covers {costSummary.pricedItemCount}/{costSummary.totalItemCount} items
              {costSummary.unpricedItems.length > 0 &&
                ` · missing: ${costSummary.unpricedItems.slice(0, 3).join(", ")}`}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <Link href={`/recipes/${recipe.id}`} className="text-sm text-[var(--primary)]">
          ← Back to recipe
        </Link>
        <PrintButton />
      </div>
    </div>
  );
}
