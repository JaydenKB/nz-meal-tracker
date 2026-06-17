import { convertQuantity, normalizeForNutrition, normalizeUnit } from "@/lib/nutrition/units";

export function getBaseUnitForCost(unit: string, defaultUnit: string): string {
  const u = normalizeUnit(unit, "g");
  if (["g", "kg"].includes(u)) return "g";
  if (["ml", "l", "tsp", "tbsp", "cup"].includes(u)) return "ml";
  return defaultUnit === "each" ? "each" : defaultUnit;
}

export function estimatePackagesForLine(
  quantity: number,
  unit: string,
  defaultUnit: string,
  product: { packageSize: number; packageUnit: string },
): number {
  if (defaultUnit === "each" || product.packageUnit === "each") {
    return Math.max(1, Math.ceil(quantity / product.packageSize));
  }

  try {
    const { amount } = normalizeForNutrition(quantity, unit, defaultUnit);
    const neededInPackageUnit = convertQuantity(
      amount,
      defaultUnit === "each" ? "g" : getBaseUnitForCost(unit, defaultUnit),
      product.packageUnit,
    );
    return Math.max(1, Math.ceil(neededInPackageUnit / product.packageSize));
  } catch {
    return Math.max(1, Math.ceil(quantity / product.packageSize));
  }
}

export function lineCostFromProduct(
  quantity: number,
  unit: string,
  defaultUnit: string,
  product: { packageSize: number; packageUnit: string; priceNzd: number | null },
): number | null {
  if (!product.priceNzd) return null;
  const packages = estimatePackagesForLine(quantity, unit, defaultUnit, product);
  return Math.round(product.priceNzd * packages * 100) / 100;
}
