"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Barcode, ChevronRight, Plus, Scan, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddIngredientForm } from "@/components/ingredients/add-ingredient-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecipeIcon } from "@/components/ui/recipe-icon";

type Ingredient = {
  id: number;
  name: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  isProcessed: boolean;
};

export function IngredientsPageClient({
  ingredients: initial,
}: {
  ingredients: Ingredient[];
}) {
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initial;
    return initial.filter((i) => i.name.toLowerCase().includes(q));
  }, [query, initial]);

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/shop"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white text-[var(--foreground)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[1.75rem] font-medium text-[var(--foreground)]">Ingredients</h1>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ingredients"
          className="bg-[var(--beige)] pl-10"
        />
      </div>

      <Link href="/ingredients/barcode">
        <Button className="w-full">
          <Barcode className="h-4 w-4" />
          Scan barcode
        </Button>
      </Link>

      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" className="w-full" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add manually
        </Button>
        <Link
          href="/ingredients/import"
          className={cn(
            "inline-flex h-11 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--ai-soft)] text-sm font-semibold text-[var(--ai)] transition-colors active:opacity-80",
          )}
        >
          <Scan className="h-4 w-4" />
          Label scan
        </Link>
      </div>

      {showAdd && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
          <AddIngredientForm />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((ing, idx) => (
          <Link
            key={ing.id}
            href={`/ingredients/${ing.id}`}
            className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
          >
            <RecipeIcon index={idx} className="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium text-[var(--foreground)]">{ing.name}</p>
                {ing.isProcessed && (
                  <span className="shrink-0 rounded-md bg-[var(--streak-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--streak)]">
                    processed
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--muted)]">
                {Math.round(ing.calories)} kcal · {Math.round(ing.proteinG)}g protein /100g
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
