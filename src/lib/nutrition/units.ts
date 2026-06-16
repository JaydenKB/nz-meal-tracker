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

/** Map LLM / human unit strings to a supported unit. */
export function normalizeUnit(raw: string, fallback: SupportedUnit = "g"): SupportedUnit {
  const u = raw.trim().toLowerCase();
  if ((SUPPORTED_UNITS as readonly string[]).includes(u)) {
    return u as SupportedUnit;
  }
  if (UNIT_ALIASES[u]) return UNIT_ALIASES[u];
  if (/whole|piece|clove|head|bunch|slice|item|egg|count/.test(u)) {
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

export function normalizeForNutrition(
  quantity: number,
  unit: string,
  defaultUnit: string,
): { amount: number; basis: "per100g" | "perEach" } {
  const normalizedUnit = normalizeUnit(unit, normalizeUnit(defaultUnit, "g"));
  const normalizedDefault = normalizeUnit(defaultUnit, "g");

  if (normalizedUnit === "each" || normalizedDefault === "each") {
    return { amount: quantity, basis: "perEach" };
  }

  const kind = getUnitKind(normalizedUnit);
  const defaultKind = getUnitKind(normalizedDefault);

  if (kind === "mass" || defaultKind === "mass") {
    const grams =
      kind === "mass"
        ? toGrams(quantity, normalizedUnit)
        : toGrams(quantity, normalizedDefault);
    return { amount: grams, basis: "per100g" };
  }

  const ml =
    kind === "volume"
      ? toMilliliters(quantity, normalizedUnit)
      : toMilliliters(quantity, normalizedDefault);
  return { amount: ml, basis: "per100g" };
}

export function formatQuantity(quantity: number, unit: string): string {
  const rounded = quantity >= 10 ? Math.round(quantity) : Math.round(quantity * 10) / 10;
  return `${rounded} ${unit}`;
}
