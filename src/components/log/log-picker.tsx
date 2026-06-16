"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { RecipeIcon } from "@/components/ui/recipe-icon";
import { MEAL_LABELS, MEAL_ORDER, todayString } from "@/lib/log/compute";
import { mealTypeFromTime } from "@/lib/log/mealTime";
import type { MealType } from "@/lib/db/schema";
import { playLogSound } from "@/lib/sfx";

type PickerItem = {
  id: number;
  name: string;
  kcal?: number;
  accentIndex?: number;
};

type Filter = "recipes" | "ingredients" | "quick";

export function LogPickerClient() {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(() => mealTypeFromTime());
  const [filter, setFilter] = useState<Filter>("recipes");
  const [query, setQuery] = useState("");
  const [servings, setServings] = useState(1);
  const [recipes, setRecipes] = useState<PickerItem[]>([]);
  const [ingredients, setIngredients] = useState<PickerItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes-list").then((r) => r.json()),
      fetch("/api/ingredients-list").then((r) => r.json()),
    ]).then(([r, i]) => {
      setRecipes(
        (r.recipes ?? []).map((item: PickerItem, idx: number) => ({
          ...item,
          accentIndex: idx,
        })),
      );
      setIngredients(i.ingredients ?? []);
    });
  }, []);

  const items = useMemo(() => {
    const list = filter === "ingredients" ? ingredients : recipes;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) => item.name.toLowerCase().includes(q));
  }, [filter, query, recipes, ingredients]);

  const logItem = useCallback(
    async (item: PickerItem) => {
      if (busy) return;
      setBusy(true);

      const body: Record<string, unknown> = {
        date: todayString(),
        mealType,
        servings,
      };
      if (filter === "ingredients") body.ingredientId = item.id;
      else body.recipeId = item.id;

      await fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      playLogSound();
      setBusy(false);
      router.push("/");
      router.refresh();
    },
    [busy, filter, mealType, router, servings],
  );

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[1.75rem] font-medium text-[var(--foreground)]">Log a meal</h1>
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-white text-[var(--foreground)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </Link>
      </header>

      <div className="flex gap-2">
        {MEAL_ORDER.map((m) => (
          <Pill
            key={m}
            active={mealType === m}
            onClick={() => setMealType(m)}
            className="flex-1 px-2 text-xs"
          >
            {MEAL_LABELS[m]}
          </Pill>
        ))}
      </div>
      <p className="text-xs font-normal text-[var(--muted)]">
        Auto-set from time of day · tap to change
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="bg-[var(--beige)] pl-10"
        />
      </div>

      <div className="flex gap-2">
        {(["recipes", "ingredients", "quick"] as const).map((f) => (
          <Pill
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
            className="flex-1 px-2 text-xs capitalize"
          >
            {f === "quick" ? "Quick add" : f}
          </Pill>
        ))}
      </div>

      {filter === "quick" ? (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] p-4">
          <p className="text-sm text-[var(--muted)]">
            Quick add lets you log a single ingredient by weight. Pick from Ingredients tab for now.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => setFilter("ingredients")}>
            Switch to ingredients
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3.5 py-3"
            >
              <RecipeIcon index={item.accentIndex ?? idx} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--foreground)]">{item.name}</p>
                {item.kcal != null && (
                  <p className="text-sm text-[var(--muted)]">{item.kcal} kcal / serving</p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => logItem(item)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white disabled:opacity-50"
                aria-label={`Add ${item.name}`}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-3">
        <span className="text-sm font-medium text-[var(--foreground)]">Servings</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[2rem] text-center text-base font-medium">{servings}</span>
          <button
            type="button"
            onClick={() => setServings((s) => s + 0.5)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
