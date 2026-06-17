"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecipePantryMatch } from "@/lib/pantry/recipe-match";

export function RecipePantryShortfallClient({
  match,
}: {
  match: RecipePantryMatch;
}) {
  const router = useRouter();
  const gapCount = match.needToBuy.length;

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-8">
      <header className="flex items-center gap-3">
        <Link
          href="/recipes/cook-from-pantry"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-medium">{match.recipeName}</h1>
      </header>

      <div className="rounded-[var(--radius-card)] border border-[#e8c99a] bg-[var(--orange-soft)] px-4 py-3.5">
        <p className="font-medium text-[var(--foreground)]">
          {gapCount} item{gapCount === 1 ? "" : "s"} short to cook this
        </p>
        <p className="mt-0.5 text-sm text-[var(--muted)]">Everything else is in your pantry</p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          In your pantry
        </h2>
        <div className="divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
          {match.inPantry.map((line) => (
            <div key={line.ingredientId} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Check className="h-4 w-4 shrink-0 text-[var(--success)]" strokeWidth={2.5} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--foreground)]">{line.ingredientName}</p>
                <p className="text-[var(--muted)]">
                  {line.status === "short"
                    ? `have ${line.onHandDisplay} · need ${line.requiredDisplay}`
                    : line.status === "staple_ok"
                      ? "staple · assumed on hand"
                      : line.onHandDisplay === line.requiredDisplay
                        ? "plenty"
                        : `have ${line.onHandDisplay} · need ${line.requiredDisplay}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {match.uncertain.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Check manually
          </h2>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-3 text-sm text-[var(--muted)]">
            {match.uncertain.map((l) => l.ingredientName).join(", ")} — conversion uncertain; verify
            amounts yourself.
          </div>
        </section>
      )}

      {match.needToBuy.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Need to buy
          </h2>
          <div className="divide-y divide-red-100 rounded-[var(--radius-card)] border border-red-100 bg-red-50/40">
            {match.needToBuy.map((line) => (
              <div key={line.ingredientId} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="h-4 w-4 shrink-0 rounded border border-red-300 bg-white" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--foreground)]">{line.ingredientName}</p>
                  <p className="text-[var(--muted)]">{line.shortfallDisplay ?? line.requiredDisplay}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2">
        <Link href={`/shop/recipe/${match.recipeId}`}>
          <Button className="w-full">
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            Add missing to shopping list
          </Button>
        </Link>
        <Button variant="outline" className="w-full" onClick={() => router.push(`/recipes/${match.recipeId}/cook`)}>
          Cook anyway
        </Button>
      </div>
    </div>
  );
}
