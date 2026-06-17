import type { Ingredient } from "@/lib/db/schema";
import {
  calculateLineMacros,
  calculateLineNutrients,
  type Macros,
  type RecipeLineInput,
} from "./calculate";
import { convert, getUnitKind, normalizeUnit, resolveNutritionAmount } from "./units";

export type RecipeLineConversionIssue = {
  lineId: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  reason: string;
};

export type RecipeConversionSummary = {
  exact: boolean;
  inexactCount: number;
  issues: RecipeLineConversionIssue[];
  inexactIngredientIds: number[];
};

type LineWithIngredient = {
  id: number;
  quantity: number;
  unit: string;
  ingredient: Ingredient;
};

function lineNeedsCrossKindConversion(quantity: number, unit: string, ingredient: Ingredient): boolean {
  const lineUnit = normalizeUnit(unit, normalizeUnit(ingredient.defaultUnit, "g"));
  const defaultUnit = normalizeUnit(ingredient.defaultUnit, "g");
  const lineKind = getUnitKind(lineUnit);
  const defaultKind = getUnitKind(defaultUnit);

  if (lineUnit === defaultUnit) return false;
  if (lineKind === defaultKind) return false;
  if (lineKind === "each" || defaultKind === "each") return true;
  return lineKind !== defaultKind;
}

export function analyzeRecipeLineConversion(
  line: LineWithIngredient,
): { exact: boolean; reason?: string } {
  if (!lineNeedsCrossKindConversion(line.quantity, line.unit, line.ingredient)) {
    return { exact: true };
  }

  const resolved = resolveNutritionAmount(line.quantity, line.unit, {
    defaultUnit: line.ingredient.defaultUnit,
    canonicalUnit: line.ingredient.canonicalUnit,
    mlPerGram: line.ingredient.mlPerGram,
    gramsPerUnit: line.ingredient.gramsPerUnit,
    name: line.ingredient.name,
  });

  if (resolved.exact) return { exact: true };
  return {
    exact: false,
    reason: resolved.reason ?? "missing_conversion_data",
  };
}

export function analyzeRecipeConversion(lines: LineWithIngredient[]): RecipeConversionSummary {
  const issues: RecipeLineConversionIssue[] = [];

  for (const line of lines) {
    const result = analyzeRecipeLineConversion(line);
    if (!result.exact) {
      issues.push({
        lineId: line.id,
        ingredientId: line.ingredient.id,
        ingredientName: line.ingredient.name,
        quantity: line.quantity,
        unit: line.unit,
        reason: result.reason ?? "missing_conversion_data",
      });
    }
  }

  const inexactIngredientIds = [...new Set(issues.map((i) => i.ingredientId))];

  return {
    exact: issues.length === 0,
    inexactCount: issues.length,
    issues,
    inexactIngredientIds,
  };
}

export function toRecipeLineInput(line: LineWithIngredient): RecipeLineInput {
  return {
    quantity: line.quantity,
    unit: line.unit,
    ingredient: line.ingredient,
  };
}

export function calculateRecipeMacros(lines: LineWithIngredient[]): {
  total: Macros;
  macrosExact: boolean;
  conversion: RecipeConversionSummary;
} {
  const conversion = analyzeRecipeConversion(lines);
  const lineMacros = lines.map((l) => calculateLineMacros(toRecipeLineInput(l)));
  const total = lineMacros.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      fatG: acc.fatG + m.fatG,
      carbsG: acc.carbsG + m.carbsG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  return {
    total,
    macrosExact: conversion.exact,
    conversion,
  };
}

/** Whether a pantry/shopping line can be converted to canonical units exactly. */
export function canConvertToCanonicalExactly(
  quantity: number,
  unit: string,
  ingredient: Ingredient,
): boolean {
  const canonical =
    ingredient.canonicalUnit === "g" ||
    ingredient.canonicalUnit === "ml" ||
    ingredient.canonicalUnit === "each"
      ? ingredient.canonicalUnit
      : getUnitKind(normalizeUnit(ingredient.defaultUnit, "g")) === "volume"
        ? "ml"
        : normalizeUnit(ingredient.defaultUnit, "g") === "each"
          ? "each"
          : "g";

  const from = normalizeUnit(unit, normalizeUnit(ingredient.defaultUnit, "g"));
  if (from === canonical) return true;

  const result = convert(quantity, from, canonical === "each" ? "each" : canonical, ingredient);
  return result.exact;
}

export { calculateLineNutrients };
