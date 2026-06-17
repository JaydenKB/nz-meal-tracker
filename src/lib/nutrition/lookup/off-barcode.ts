import type { BarcodeDraft } from "@/lib/import/barcode-types";
import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";
import {
  getCachedBarcodeDraft,
  setCachedBarcodeDraft,
} from "@/lib/nutrition/lookup/off-barcode-cache";
import {
  packageSizeToGrams,
  parsePackageQuantity,
} from "@/lib/nutrition/lookup/parse-package-quantity";

const OFF_FIELDS =
  "product_name,brands,quantity,nutriments,image_url,nova_group,nutriscore_grade,code";

const USER_AGENT = "NZMealTracker/1.0 (personal; barcode lookup)";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildName(productName?: string, brands?: string): string {
  const name = (productName ?? "").trim();
  const brand = (brands ?? "").trim();
  if (!name && brand) return brand;
  if (brand && name && !name.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${name}`;
  }
  return name || brand || "Unknown product";
}

function mapNutrients(n: Record<string, unknown>): ExtendedNutrients {
  const sodium100g = num(n["sodium_100g"]);
  const salt100g = num(n["salt_100g"]);
  let sodiumMg: number | undefined;
  if (sodium100g != null) sodiumMg = sodium100g * 1000;
  else if (salt100g != null) sodiumMg = salt100g * 400;

  return {
    fiberG: num(n["fiber_100g"]) ?? undefined,
    sugarG: num(n["sugars_100g"]) ?? undefined,
    saturatedFatG: num(n["saturated-fat_100g"]) ?? undefined,
    sodiumMg,
  };
}

function missingMacroFields(draft: Omit<BarcodeDraft, "missingFields" | "nutritionSource">): string[] {
  const missing: string[] = [];
  if (draft.calories == null || draft.calories <= 0) missing.push("calories");
  if (draft.proteinG == null) missing.push("protein");
  if (draft.fatG == null) missing.push("fat");
  if (draft.carbsG == null) missing.push("carbs");
  if (draft.packageSize == null || draft.packageSize <= 0) missing.push("package size");
  return missing;
}

export function normalizeBarcode(raw: string): string | null {
  const code = raw.replace(/\D/g, "");
  if (code.length < 7 || code.length > 14) return null;
  return code;
}

export function isSparseDraft(draft: BarcodeDraft): boolean {
  const hasMacro =
    (draft.calories != null && draft.calories > 0) ||
    (draft.proteinG != null && draft.proteinG > 0) ||
    (draft.fatG != null && draft.fatG > 0) ||
    (draft.carbsG != null && draft.carbsG > 0);
  return !hasMacro;
}

type OffProduct = {
  product_name?: string;
  brands?: string;
  quantity?: string;
  nutriments?: Record<string, unknown>;
  image_url?: string;
  nova_group?: number;
  code?: string;
};

export async function fetchOpenFoodFactsByBarcode(
  barcode: string,
): Promise<BarcodeDraft | null> {
  const cached = getCachedBarcodeDraft(barcode);
  if (cached !== undefined) return cached;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${OFF_FIELDS}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 86400 },
    });
  } catch {
    throw new Error("OFFLINE");
  }

  if (!res.ok) {
    setCachedBarcodeDraft(barcode, null);
    return null;
  }

  const data = (await res.json()) as { status?: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) {
    setCachedBarcodeDraft(barcode, null);
    return null;
  }

  const p = data.product;
  const n = p.nutriments ?? {};
  const parsedQty = parsePackageQuantity(p.quantity);
  const packageSize =
    parsedQty.size != null ? packageSizeToGrams(parsedQty.size, parsedQty.unit) : null;

  const calories =
    num(n["energy-kcal_100g"]) ??
    (num(n["energy_100g"]) != null ? Math.round(num(n["energy_100g"])! / 4.184) : null);

  const base = {
    barcode,
    name: buildName(p.product_name, p.brands),
    brand: p.brands?.trim() || undefined,
    packageSize,
    packageUnit: "g",
    calories: calories != null ? Math.round(calories) : null,
    proteinG: num(n["proteins_100g"]),
    fatG: num(n["fat_100g"]),
    carbsG: num(n["carbohydrates_100g"]),
    nutrients: mapNutrients(n),
    imageUrl: p.image_url || undefined,
    isProcessed: (p.nova_group ?? 0) >= 3,
  };

  const draft: BarcodeDraft = {
    ...base,
    nutritionSource: "openfoodfacts",
    missingFields: missingMacroFields(base),
  };

  setCachedBarcodeDraft(barcode, draft);
  return draft;
}
