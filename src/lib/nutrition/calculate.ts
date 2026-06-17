import type { Ingredient } from "@/lib/db/schema";
import { resolveNutritionAmount } from "./units";
import type { ExtendedNutrients } from "./nutrients";
import { parseNutrientsJson } from "./nutrients";

export type Macros = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export type ConversionIngredientFields = Pick<
  Ingredient,
  | "calories"
  | "proteinG"
  | "fatG"
  | "carbsG"
  | "defaultUnit"
  | "nutrientsJson"
  | "mlPerGram"
  | "gramsPerUnit"
  | "canonicalUnit"
> & { name?: string };

export type NutrientLineInput = {
  quantity: number;
  unit: string;
  ingredient: Pick<
    Ingredient,
    "defaultUnit" | "nutrientsJson" | "mlPerGram" | "gramsPerUnit" | "canonicalUnit"
  > & { name?: string };
};

export type RecipeLineInput = {
  quantity: number;
  unit: string;
  ingredient: ConversionIngredientFields;
};

export type LineMacroResult = Macros & { exact: boolean };

function nutritionFactor(quantity: number, unit: string, ingredient: ConversionIngredientFields): {
  factor: number;
  exact: boolean;
} {
  const resolved = resolveNutritionAmount(quantity, unit, {
    defaultUnit: ingredient.defaultUnit,
    canonicalUnit: ingredient.canonicalUnit,
    mlPerGram: ingredient.mlPerGram,
    gramsPerUnit: ingredient.gramsPerUnit,
    name: ingredient.name,
  });

  if (resolved.basis === "perEach") {
    return { factor: resolved.amount, exact: resolved.exact };
  }
  return { factor: resolved.amount / 100, exact: resolved.exact };
}

export function calculateLineMacros(line: RecipeLineInput): LineMacroResult {
  const { factor, exact } = nutritionFactor(line.quantity, line.unit, line.ingredient);

  return {
    calories: line.ingredient.calories * factor,
    proteinG: line.ingredient.proteinG * factor,
    fatG: line.ingredient.fatG * factor,
    carbsG: line.ingredient.carbsG * factor,
    exact,
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

export function calculateLineNutrients(line: NutrientLineInput): ExtendedNutrients {
  const per100 = parseNutrientsJson(line.ingredient.nutrientsJson);
  const { factor } = nutritionFactor(line.quantity, line.unit, line.ingredient as ConversionIngredientFields);
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
