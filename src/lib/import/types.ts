import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";

export type RawScannedItem = {
  name: string;
  packageSize: number;
  packageUnit: string;
  priceNzd: number | null;
  priceUnclear: boolean;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  isProcessed: boolean;
};

export type DetectedItem = RawScannedItem & {
  id: string;
  pricePer100g: number | null;
  selected: boolean;
  warning?: string;
  nutrients?: ExtendedNutrients;
  nutritionSource?: string;
};

export function toGrams(size: number, unit: string): number {
  const u = unit.toLowerCase().trim();
  if (u === "kg" || u === "kilogram") return Math.round(size * 1000);
  if (u === "l" || u === "litre" || u === "liter") return Math.round(size * 1000);
  return Math.round(size);
}

export function computePricePer100g(
  priceNzd: number | null,
  packageSizeGrams: number,
): number | null {
  if (priceNzd == null || !packageSizeGrams) return null;
  return Math.round((priceNzd / packageSizeGrams) * 1000) / 100;
}

export function recalcDetectedItem(item: DetectedItem): DetectedItem {
  const packageSize = toGrams(item.packageSize, item.packageUnit);
  const priceUnclear = item.priceNzd == null;
  const pricePer100g = computePricePer100g(item.priceNzd, packageSize);

  return {
    ...item,
    packageSize,
    packageUnit: "g",
    priceUnclear,
    pricePer100g,
    warning: priceUnclear ? "Price unclear — please confirm" : undefined,
  };
}

export type FailedScan = {
  uploadId: string;
  imageIndex: number;
  preview: string;
  error: string;
};

export function normalizeScannedItem(
  raw: RawScannedItem,
  index: number,
  idPrefix = "",
): DetectedItem {
  const grams = toGrams(raw.packageSize, raw.packageUnit);
  const priceUnclear = raw.priceUnclear || raw.priceNzd == null;

  return recalcDetectedItem({
    ...raw,
    id: `item-${idPrefix}${index}-${Date.now()}`,
    packageSize: grams,
    packageUnit: "g",
    priceNzd: raw.priceNzd,
    priceUnclear,
    pricePer100g: null,
    selected: true,
  });
}
