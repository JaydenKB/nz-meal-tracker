import { lookupReferenceConversion } from "./conversion-reference";

export type UnitKind = "mass" | "volume" | "each";

/**
 * NZ kitchen volume measures.
 *
 * AU/NZ formal tablespoon is 20 ml (FSANZ). Most NZ home-recipe sources and
 * nutrition databases use a 15 ml tablespoon (3 × 5 ml tsp), which this app
 * follows so cup/tbsp macros align with common labels and USDA-style refs.
 *
 * Metric cup: 240 ml (aligned with US legal cup used in many nutrition APIs).
 */
export const NZ_KITCHEN_VOLUME = {
  tspMl: 5,
  tbspMl: 15,
  cupMl: 240,
} as const;

const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: NZ_KITCHEN_VOLUME.tspMl,
  tbsp: NZ_KITCHEN_VOLUME.tbspMl,
  cup: NZ_KITCHEN_VOLUME.cupMl,
};

export const SUPPORTED_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "each",
] as const;

export type SupportedUnit = (typeof SUPPORTED_UNITS)[number];

const UNIT_ALIASES: Record<string, SupportedUnit> = {
  whole: "each",
  piece: "each",
  pieces: "each",
  pc: "each",
  pcs: "each",
  item: "each",
  items: "each",
  unit: "each",
  units: "each",
  clove: "each",
  cloves: "each",
  head: "each",
  bunch: "each",
  slice: "each",
  slices: "each",
  egg: "each",
  eggs: "each",
  large: "each",
  medium: "each",
  small: "each",
  serving: "each",
  servings: "each",
  thumb: "each",
  sprig: "each",
  sprigs: "each",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cups: "cup",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  litre: "l",
  liter: "l",
  litres: "l",
  liters: "l",
};

export function normalizeUnit(raw: string, fallback: SupportedUnit = "g"): SupportedUnit {
  const u = raw.trim().toLowerCase();
  if ((SUPPORTED_UNITS as readonly string[]).includes(u)) {
    return u as SupportedUnit;
  }
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  if (/whole|piece|clove|head|bunch|slice|item|egg|count|thumb|sprig/.test(u)) {
    return "each";
  }
  return fallback;
}

export function getUnitKind(unit: string): UnitKind {
  const normalized = normalizeUnit(unit, "g");
  if (normalized === "each") return "each";
  if (normalized in MASS_TO_GRAMS) return "mass";
  if (normalized in VOLUME_TO_ML) return "volume";
  return "mass";
}

export type ConversionFields = {
  defaultUnit?: string;
  canonicalUnit?: string | null;
  mlPerGram?: number | null;
  gramsPerUnit?: number | null;
  name?: string;
};

export type ConvertResult =
  | { value: number; exact: true }
  | {
      value: number | null;
      exact: false;
      reason: "missing_density" | "missing_grams_per_each" | "unsupported_cross_kind";
      estimate?: number;
    };

export function densityGPerMlFromIngredient(ingredient: ConversionFields): number | null {
  if (ingredient.mlPerGram != null && ingredient.mlPerGram > 0) {
    return 1 / ingredient.mlPerGram;
  }
  return null;
}

export function gramsPerEachFromIngredient(ingredient: ConversionFields): number | null {
  if (ingredient.gramsPerUnit != null && ingredient.gramsPerUnit > 0) {
    return ingredient.gramsPerUnit;
  }
  return null;
}

function referenceEstimate(
  ingredient: ConversionFields,
  fromKind: UnitKind,
  toKind: UnitKind,
  amount: number,
  from: SupportedUnit,
): number | null {
  if (!ingredient.name) return null;
  const ref = lookupReferenceConversion(ingredient.name);
  if (!ref) return null;

  if (fromKind === "volume" && toKind === "mass" && ref.densityGPerMl) {
    return toMilliliters(amount, from) * ref.densityGPerMl;
  }
  if (fromKind === "mass" && toKind === "volume" && ref.densityGPerMl) {
    return toGrams(amount, from) / ref.densityGPerMl;
  }
  if (fromKind === "each" && toKind === "mass" && ref.gramsPerEach) {
    return amount * ref.gramsPerEach;
  }
  if (fromKind === "mass" && toKind === "each" && ref.gramsPerEach) {
    return toGrams(amount, from) / ref.gramsPerEach;
  }
  return null;
}

export function convert(
  amount: number,
  fromUnit: string,
  toUnit: string,
  ingredient: ConversionFields = {},
): ConvertResult {
  const from = normalizeUnit(fromUnit, normalizeUnit(ingredient.defaultUnit ?? "g", "g"));
  const to = normalizeUnit(toUnit, from);
  if (from === to) return { value: amount, exact: true };

  const fromKind = getUnitKind(from);
  const toKind = getUnitKind(to);

  if (fromKind === "mass" && toKind === "mass") {
    return { value: convertQuantity(amount, from, to), exact: true };
  }
  if (fromKind === "volume" && toKind === "volume") {
    return { value: convertQuantity(amount, from, to), exact: true };
  }

  if (fromKind === "volume" && toKind === "mass") {
    const density = densityGPerMlFromIngredient(ingredient);
    if (density != null) {
      return { value: toMilliliters(amount, from) * density, exact: true };
    }
    const estimate = referenceEstimate(ingredient, fromKind, toKind, amount, from);
    return {
      value: null,
      exact: false,
      reason: "missing_density",
      estimate: estimate ?? undefined,
    };
  }

  if (fromKind === "mass" && toKind === "volume") {
    const density = densityGPerMlFromIngredient(ingredient);
    if (density != null) {
      return { value: toGrams(amount, from) / density, exact: true };
    }
    const estimate = referenceEstimate(ingredient, fromKind, toKind, amount, from);
    return {
      value: null,
      exact: false,
      reason: "missing_density",
      estimate: estimate ?? undefined,
    };
  }

  if (fromKind === "each" && toKind === "mass") {
    const gpe = gramsPerEachFromIngredient(ingredient);
    if (gpe != null) {
      return { value: amount * gpe, exact: true };
    }
    const estimate = referenceEstimate(ingredient, fromKind, toKind, amount, from);
    return {
      value: null,
      exact: false,
      reason: "missing_grams_per_each",
      estimate: estimate ?? undefined,
    };
  }

  if (fromKind === "mass" && toKind === "each") {
    const gpe = gramsPerEachFromIngredient(ingredient);
    if (gpe != null) {
      return { value: toGrams(amount, from) / gpe, exact: true };
    }
    const estimate = referenceEstimate(ingredient, fromKind, toKind, amount, from);
    return {
      value: null,
      exact: false,
      reason: "missing_grams_per_each",
      estimate: estimate ?? undefined,
    };
  }

  if (fromKind === "each" && toKind === "volume") {
    const gpe = gramsPerEachFromIngredient(ingredient);
    const density = densityGPerMlFromIngredient(ingredient);
    if (gpe != null && density != null) {
      return { value: (amount * gpe) / density, exact: true };
    }
    return { value: null, exact: false, reason: "unsupported_cross_kind" };
  }

  if (fromKind === "volume" && toKind === "each") {
    const gpe = gramsPerEachFromIngredient(ingredient);
    const density = densityGPerMlFromIngredient(ingredient);
    if (gpe != null && density != null) {
      return { value: (toMilliliters(amount, from) * density) / gpe, exact: true };
    }
    return { value: null, exact: false, reason: "unsupported_cross_kind" };
  }

  return { value: null, exact: false, reason: "unsupported_cross_kind" };
}

export function toGrams(quantity: number, unit: string): number {
  const normalized = normalizeUnit(unit, "g");
  const factor = MASS_TO_GRAMS[normalized];
  if (!factor) {
    throw new Error(`Unsupported unit '${unit}'`);
  }
  return quantity * factor;
}

export function toMilliliters(quantity: number, unit: string): number {
  const normalized = normalizeUnit(unit, "ml");
  const factor = VOLUME_TO_ML[normalized];
  if (!factor) {
    throw new Error(`Unsupported unit '${unit}'`);
  }
  return quantity * factor;
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  const from = normalizeUnit(fromUnit, "g");
  const to = normalizeUnit(toUnit, "g");
  if (from === to) return quantity;

  const fromKind = getUnitKind(from);
  const toKind = getUnitKind(to);

  if (fromKind === "each" || toKind === "each") {
    if (from === to) return quantity;
    throw new Error(`Cannot convert between ${fromUnit} and ${toUnit}`);
  }

  if (fromKind === "mass" && toKind === "mass") {
    return (quantity * MASS_TO_GRAMS[from]) / MASS_TO_GRAMS[to];
  }

  if (fromKind === "volume" && toKind === "volume") {
    return (quantity * VOLUME_TO_ML[from]) / VOLUME_TO_ML[to];
  }

  throw new Error(`Cannot convert between ${fromUnit} and ${toUnit}`);
}

export type NutritionBasis = "per100g" | "per100ml" | "perEach";

export type NutritionAmountResult = {
  amount: number;
  basis: NutritionBasis;
  exact: boolean;
  reason?: string;
};

export function resolveNutritionAmount(
  quantity: number,
  unit: string,
  ingredient: ConversionFields,
): NutritionAmountResult {
  const lineUnit = normalizeUnit(unit, normalizeUnit(ingredient.defaultUnit ?? "g", "g"));
  const defaultUnit = normalizeUnit(ingredient.defaultUnit ?? "g", "g");
  const defaultKind = getUnitKind(defaultUnit);

  if (defaultUnit === "each" || lineUnit === "each") {
    if (defaultUnit === "each" && lineUnit === "each") {
      return { amount: quantity, basis: "perEach", exact: true };
    }
    if (defaultKind === "mass" && lineUnit === "each") {
      const conv = convert(quantity, lineUnit, "g", ingredient);
      if (conv.exact) return { amount: conv.value, basis: "per100g", exact: true };
      if (conv.estimate != null) {
        return { amount: conv.estimate, basis: "per100g", exact: false, reason: conv.reason };
      }
      return { amount: 0, basis: "per100g", exact: false, reason: conv.reason };
    }
    if (defaultKind === "volume" && lineUnit === "each") {
      const conv = convert(quantity, lineUnit, "ml", ingredient);
      if (conv.exact) return { amount: conv.value, basis: "per100ml", exact: true };
      if (conv.estimate != null) {
        return { amount: conv.estimate, basis: "per100ml", exact: false, reason: conv.reason };
      }
      return { amount: 0, basis: "per100ml", exact: false, reason: conv.reason };
    }
    return { amount: quantity, basis: "perEach", exact: false, reason: "unsupported_cross_kind" };
  }

  if (defaultKind === "mass") {
    if (getUnitKind(lineUnit) === "mass") {
      return { amount: toGrams(quantity, lineUnit), basis: "per100g", exact: true };
    }
    const conv = convert(quantity, lineUnit, "g", ingredient);
    if (conv.exact) return { amount: conv.value, basis: "per100g", exact: true };
    if (conv.estimate != null) {
      return { amount: conv.estimate, basis: "per100g", exact: false, reason: conv.reason };
    }
    return { amount: 0, basis: "per100g", exact: false, reason: conv.reason };
  }

  if (defaultKind === "volume") {
    if (getUnitKind(lineUnit) === "volume") {
      return { amount: toMilliliters(quantity, lineUnit), basis: "per100ml", exact: true };
    }
    const conv = convert(quantity, lineUnit, "ml", ingredient);
    if (conv.exact) return { amount: conv.value, basis: "per100ml", exact: true };
    if (conv.estimate != null) {
      return { amount: conv.estimate, basis: "per100ml", exact: false, reason: conv.reason };
    }
    return { amount: 0, basis: "per100ml", exact: false, reason: conv.reason };
  }

  return { amount: quantity, basis: "perEach", exact: false, reason: "unsupported_cross_kind" };
}

/** @deprecated Use resolveNutritionAmount. */
export function normalizeForNutrition(
  quantity: number,
  unit: string,
  defaultUnit: string,
): { amount: number; basis: "per100g" | "perEach" } {
  const resolved = resolveNutritionAmount(quantity, unit, { defaultUnit });
  if (resolved.basis === "per100ml") {
    return { amount: resolved.amount, basis: "per100g" };
  }
  return { amount: resolved.amount, basis: resolved.basis === "perEach" ? "perEach" : "per100g" };
}

export function previewKitchenConversions(ingredient: ConversionFields): {
  tsp: { ml: number; grams: number | null; exact: boolean };
  tbsp: { ml: number; grams: number | null; exact: boolean };
  cup: { ml: number; grams: number | null; exact: boolean };
  each: { grams: number | null; exact: boolean };
} {
  const row = (unit: "tsp" | "tbsp" | "cup") => {
    const ml = toMilliliters(1, unit);
    const toG = convert(1, unit, "g", ingredient);
    const grams = toG.exact ? toG.value : (toG.estimate ?? null);
    return { ml, grams, exact: toG.exact };
  };
  const eachG = convert(1, "each", "g", ingredient);
  return {
    tsp: row("tsp"),
    tbsp: row("tbsp"),
    cup: row("cup"),
    each: {
      grams: eachG.exact ? eachG.value : (eachG.estimate ?? null),
      exact: eachG.exact,
    },
  };
}

export function ingredientConversionComplete(ingredient: ConversionFields): boolean {
  const canonical =
    ingredient.canonicalUnit ??
    (normalizeUnit(ingredient.defaultUnit ?? "g", "g") === "each"
      ? "each"
      : getUnitKind(normalizeUnit(ingredient.defaultUnit ?? "g", "g")) === "volume"
        ? "ml"
        : "g");

  if (canonical === "each") {
    return gramsPerEachFromIngredient(ingredient) != null;
  }
  if (canonical === "ml") {
    return true;
  }
  if (canonical === "g") {
    const du = normalizeUnit(ingredient.defaultUnit ?? "g", "g");
    if (getUnitKind(du) === "volume") {
      return densityGPerMlFromIngredient(ingredient) != null;
    }
    return true;
  }
  return false;
}

export function formatQuantity(quantity: number, unit: string): string {
  const rounded = quantity >= 10 ? Math.round(quantity) : Math.round(quantity * 10) / 10;
  return `${rounded} ${unit}`;
}

export function mlPerGramFromDensity(densityGPerMl: number): number {
  return 1 / densityGPerMl;
}
