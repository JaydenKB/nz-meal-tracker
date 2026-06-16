export type UnitKind = "mass" | "volume" | "each";

const MASS_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
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

export function getUnitKind(unit: string): UnitKind {
  if (unit === "each") return "each";
  if (unit in MASS_TO_GRAMS) return "mass";
  if (unit in VOLUME_TO_ML) return "volume";
  return "mass";
}

export function toGrams(quantity: number, unit: string): number {
  const factor = MASS_TO_GRAMS[unit];
  if (!factor) {
    throw new Error(`Unsupported mass unit: ${unit}`);
  }
  return quantity * factor;
}

export function toMilliliters(quantity: number, unit: string): number {
  const factor = VOLUME_TO_ML[unit];
  if (!factor) {
    throw new Error(`Unsupported volume unit: ${unit}`);
  }
  return quantity * factor;
}

export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return quantity;

  const fromKind = getUnitKind(fromUnit);
  const toKind = getUnitKind(toUnit);

  if (fromKind === "each" || toKind === "each") {
    if (fromUnit === toUnit) return quantity;
    throw new Error(`Cannot convert between ${fromUnit} and ${toUnit}`);
  }

  if (fromKind === "mass" && toKind === "mass") {
    return (quantity * MASS_TO_GRAMS[fromUnit]) / MASS_TO_GRAMS[toUnit];
  }

  if (fromKind === "volume" && toKind === "volume") {
    return (quantity * VOLUME_TO_ML[fromUnit]) / VOLUME_TO_ML[toUnit];
  }

  throw new Error(`Cannot convert between ${fromUnit} and ${toUnit}`);
}

export function normalizeForNutrition(
  quantity: number,
  unit: string,
  defaultUnit: string,
): { amount: number; basis: "per100g" | "perEach" } {
  if (unit === "each" || defaultUnit === "each") {
    return { amount: quantity, basis: "perEach" };
  }

  const kind = getUnitKind(unit);
  const defaultKind = getUnitKind(defaultUnit);

  if (kind === "mass" || defaultKind === "mass") {
    const grams = kind === "mass" ? toGrams(quantity, unit) : toGrams(quantity, defaultUnit);
    return { amount: grams, basis: "per100g" };
  }

  const ml = kind === "volume" ? toMilliliters(quantity, unit) : toMilliliters(quantity, defaultUnit);
  return { amount: ml, basis: "per100g" };
}

export function formatQuantity(quantity: number, unit: string): string {
  const rounded = quantity >= 10 ? Math.round(quantity) : Math.round(quantity * 10) / 10;
  return `${rounded} ${unit}`;
}
