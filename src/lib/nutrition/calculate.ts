import type { Ingredient } from "@/lib/db/schema";
import { normalizeForNutrition } from "./units";
import type { ExtendedNutrients } from "./nutrients";
import { parseNutrientsJson } from "./nutrients";

export type Macros = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export type NutrientLineInput = {
  quantity: number;
  unit: string;
  ingredient: Pick<Ingredient, "defaultUnit" | "nutrientsJson">;
};

export type RecipeLineInput = {
  quantity: number;
  unit: string;
  ingredient: Pick<
    Ingredient,
    "calories" | "proteinG" | "fatG" | "carbsG" | "defaultUnit" | "nutrientsJson"
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

function nutrientFactor(quantity: number, unit: string, defaultUnit: string): number {
  const { amount, basis } = normalizeForNutrition(quantity, unit, defaultUnit);
  return basis === "perEach" ? amount : amount / 100;
}

export function calculateLineNutrients(line: NutrientLineInput): ExtendedNutrients {
  const per100 = parseNutrientsJson(line.ingredient.nutrientsJson);
  const factor = nutrientFactor(line.quantity, line.unit, line.ingredient.defaultUnit);
  const out: ExtendedNutrients = {};

  for (const [key, val] of Object.entries(per100) as [keyof ExtendedNutrients, number][]) {
    if (val != null) {
      out[key] = Math.round(val * factor * 100) / 100;
    }
  }
  return out;
}

export function sumNutrients(lines: ExtendedNutrients[]): ExtendedNutrients {
  const out: ExtendedNutrients = {};
  for (const line of lines) {
    for (const [key, val] of Object.entries(line) as [keyof ExtendedNutrients, number][]) {
      if (val != null) {
        out[key] = (out[key] ?? 0) + val;
      }
    }
  }
  return out;
}

export function perServingNutrients(
  total: ExtendedNutrients,
  servings: number,
): ExtendedNutrients {
  const s = Math.max(servings, 1);
  const out: ExtendedNutrients = {};
  for (const [key, val] of Object.entries(total) as [keyof ExtendedNutrients, number][]) {
    if (val != null) {
      out[key] = Math.round((val / s) * 100) / 100;
    }
  }
  return out;
}
