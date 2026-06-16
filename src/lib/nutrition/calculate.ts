import type { Ingredient } from "@/lib/db/schema";
import { normalizeForNutrition } from "./units";

export type Macros = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export type RecipeLineInput = {
  quantity: number;
  unit: string;
  ingredient: Pick<
    Ingredient,
    "calories" | "proteinG" | "fatG" | "carbsG" | "defaultUnit"
  >;
};

export function calculateLineMacros(line: RecipeLineInput): Macros {
  const { amount, basis } = normalizeForNutrition(
    line.quantity,
    line.unit,
    line.ingredient.defaultUnit,
  );

  const factor = basis === "perEach" ? amount : amount / 100;

  return {
    calories: line.ingredient.calories * factor,
    proteinG: line.ingredient.proteinG * factor,
    fatG: line.ingredient.fatG * factor,
    carbsG: line.ingredient.carbsG * factor,
  };
}

export function sumMacros(lines: Macros[]): Macros {
  return lines.reduce(
    (acc, line) => ({
      calories: acc.calories + line.calories,
      proteinG: acc.proteinG + line.proteinG,
      fatG: acc.fatG + line.fatG,
      carbsG: acc.carbsG + line.carbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
}

export function perServing(total: Macros, servings: number): Macros {
  const s = Math.max(servings, 1);
  return {
    calories: total.calories / s,
    proteinG: total.proteinG / s,
    fatG: total.fatG / s,
    carbsG: total.carbsG / s,
  };
}

export function roundMacros(macros: Macros): Macros {
  return {
    calories: Math.round(macros.calories),
    proteinG: Math.round(macros.proteinG * 10) / 10,
    fatG: Math.round(macros.fatG * 10) / 10,
    carbsG: Math.round(macros.carbsG * 10) / 10,
  };
}
