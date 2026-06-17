import type { Ingredient } from "@/lib/db/schema";
import type { Macros } from "@/lib/nutrition/calculate";
import type { SuggestionAction } from "@/lib/suggestions/ollama";
import { resolveSuggestionAction } from "@/lib/suggestions/infer";

export type MacroDelta = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export type SimLine = {
  ingredientId: number;
  quantity: number;
  unit: string;
  isProcessed: boolean;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  defaultUnit: string;
  nutrientsJson: string | null;
};

export function simulateSuggestion(
  lines: SimLine[],
  s: SuggestionAction,
  ingredientMap: Map<number, Ingredient>,
): SimLine[] {
  const action = resolveSuggestionAction(s);
  const copy = [...lines];

  const toSimLine = (ing: Ingredient, quantity: number, unit: string): SimLine => ({
    ingredientId: ing.id,
    quantity,
    unit,
    isProcessed: ing.isProcessed,
    calories: ing.calories,
    proteinG: ing.proteinG,
    fatG: ing.fatG,
    carbsG: ing.carbsG,
    defaultUnit: ing.defaultUnit,
    nutrientsJson: ing.nutrientsJson,
  });

  if (action === "swap" && s.ingredient_id && s.new_ingredient_id) {
    const replacement = ingredientMap.get(s.new_ingredient_id);
    if (!replacement) return copy;
    return copy.map((l) =>
      l.ingredientId === s.ingredient_id
        ? toSimLine(replacement, l.quantity, l.unit)
        : l,
    );
  }
  if (action === "remove" && s.ingredient_id) {
    return copy.filter((l) => l.ingredientId !== s.ingredient_id);
  }
  if (action === "add" && s.new_ingredient_id) {
    const ing = ingredientMap.get(s.new_ingredient_id);
    if (ing) {
      copy.push(toSimLine(ing, s.quantity ?? 100, s.unit ?? ing.defaultUnit));
    }
  }
  if (action === "adjust" && s.ingredient_id && s.quantity != null) {
    return copy.map((l) =>
      l.ingredientId === s.ingredient_id
        ? { ...l, quantity: s.quantity!, unit: s.unit ?? l.unit }
        : l,
    );
  }
  return copy;
}

export function macroDeltaPerServing(before: Macros, after: Macros): MacroDelta {
  return {
    calories: Math.round(after.calories - before.calories),
    proteinG: Math.round((after.proteinG - before.proteinG) * 10) / 10,
    fatG: Math.round((after.fatG - before.fatG) * 10) / 10,
    carbsG: Math.round((after.carbsG - before.carbsG) * 10) / 10,
  };
}

export function formatMacroDelta(delta: MacroDelta): string {
  const parts: string[] = [];
  if (delta.calories !== 0) {
    parts.push(`${delta.calories > 0 ? "+" : ""}${delta.calories} kcal`);
  }
  if (delta.proteinG !== 0) {
    parts.push(`${delta.proteinG > 0 ? "+" : ""}${delta.proteinG}g protein`);
  }
  if (delta.fatG !== 0) {
    parts.push(`${delta.fatG > 0 ? "+" : ""}${delta.fatG}g fat`);
  }
  if (delta.carbsG !== 0) {
    parts.push(`${delta.carbsG > 0 ? "+" : ""}${delta.carbsG}g carbs`);
  }
  return parts.length > 0 ? parts.join(", ") : "minimal change";
}

export function formatScoreDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}
