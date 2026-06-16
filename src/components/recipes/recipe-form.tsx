"use client";

import { createRecipe } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import { roundMacros } from "@/lib/nutrition/calculate";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type IngredientOption = {
  id: number;
  name: string;
  defaultUnit: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  isProcessed: boolean;
};

type RowState = {
  key: number;
  ingredientId: string;
  quantity: string;
  unit: string;
};

export function RecipeForm({ ingredients }: { ingredients: IngredientOption[] }) {
  const [rows, setRows] = useState<RowState[]>([
    { key: 0, ingredientId: "", quantity: "", unit: "g" },
    { key: 1, ingredientId: "", quantity: "", unit: "g" },
    { key: 2, ingredientId: "", quantity: "", unit: "g" },
  ]);
  const [servings, setServings] = useState("4");

  const preview = useMemo(() => {
    const ingMap = new Map(ingredients.map((i) => [String(i.id), i]));
    let calories = 0;
    let proteinG = 0;
    let fatG = 0;
    let carbsG = 0;
    let processed = 0;
    let lineCount = 0;

    for (const row of rows) {
      if (!row.ingredientId || !row.quantity) continue;
      const ing = ingMap.get(row.ingredientId);
      if (!ing) continue;
      const qty = Number(row.quantity);
      if (!qty) continue;
      const factor = row.unit === "g" || row.unit === "ml" ? qty / 100 : qty;
      calories += ing.calories * factor;
      proteinG += ing.proteinG * factor;
      fatG += ing.fatG * factor;
      carbsG += ing.carbsG * factor;
      if (ing.isProcessed) processed++;
      lineCount++;
    }

    const s = Math.max(1, Number(servings) || 1);
    const perServing = roundMacros({
      calories: calories / s,
      proteinG: proteinG / s,
      fatG: fatG / s,
      carbsG: carbsG / s,
    });
    const score =
      lineCount > 0
        ? calculateHealthScore(perServing, processed, lineCount).score
        : null;

    return { perServing, score };
  }, [rows, servings, ingredients]);

  function updateRow(key: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <>
      <form id="recipe-form" action={createRecipe} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Chicken & quinoa bowl" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input
              id="servings"
              name="servings"
              type="number"
              min={1}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Time (min)</Label>
            <Input id="time" name="time" type="number" min={1} placeholder="25" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--foreground)]">Ingredients</h3>
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-2.5"
            >
              <Select
                name="ingredientId"
                value={row.ingredientId}
                onChange={(e) => updateRow(row.key, { ingredientId: e.target.value })}
                className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              >
                <option value="" disabled>Select</option>
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>{ing.name}</option>
                ))}
              </Select>
              <Input
                name="quantity"
                type="number"
                step="0.1"
                min={0}
                value={row.quantity}
                onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                placeholder="500g"
                className="w-20 shrink-0 text-right"
              />
              <Select
                name="unit"
                value={row.unit}
                onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                className="w-16 shrink-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              >
                {SUPPORTED_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                className="text-[var(--muted)]"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() =>
              setRows((r) => [
                ...r,
                { key: Date.now(), ingredientId: "", quantity: "", unit: "g" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add ingredient
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructions">Method</Label>
          <Textarea id="instructions" name="instructions" placeholder="Cook quinoa, sear chicken..." />
        </div>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--success-soft)] px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
        <p className="text-center text-sm font-medium text-[var(--foreground)]">
          {preview.score != null
            ? `${Math.round(preview.perServing.calories)} kcal · score ${Math.round(preview.score)}`
            : "Add ingredients to see live preview"}
        </p>
      </div>
    </>
  );
}
