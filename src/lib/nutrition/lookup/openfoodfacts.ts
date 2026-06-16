import type { ExtendedNutrients, NutritionLookupResult } from "../nutrients";
import { scoreNameMatch, isCompoundProduct } from "./normalize";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapOffProduct(
  p: { product_name?: string; code?: string; nutriments?: Record<string, unknown> },
  query: string,
): NutritionLookupResult | null {
  const n = p.nutriments;
  if (!n) return null;

  const calories = num(n["energy-kcal_100g"]) || num(n["energy_100g"]);
  const proteinG = num(n["proteins_100g"]);
  const fatG = num(n["fat_100g"]);
  const carbsG = num(n["carbohydrates_100g"]);

  if (calories <= 0 && proteinG <= 0 && carbsG <= 0) return null;

  const nutrients: ExtendedNutrients = {
    fiberG: num(n["fiber_100g"]) || undefined,
    sugarG: num(n["sugars_100g"]) || undefined,
    saturatedFatG: num(n["saturated-fat_100g"]) || undefined,
    sodiumMg: num(n["sodium_100g"]) ? num(n["sodium_100g"]) * 1000 : undefined,
    omega3G: num(n["omega-3-fat_100g"]) || undefined,
    vitaminAMcg: num(n["vitamin-a_100g"]) || undefined,
    vitaminCMg: num(n["vitamin-c_100g"]) || undefined,
    calciumMg: num(n["calcium_100g"]) ? num(n["calcium_100g"]) * 1000 : undefined,
    ironMg: num(n["iron_100g"]) ? num(n["iron_100g"]) * 1000 : undefined,
    potassiumMg: num(n["potassium_100g"]) ? num(n["potassium_100g"]) * 1000 : undefined,
  };

  return {
    name: p.product_name ?? query,
    source: "openfoodfacts",
    sourceId: p.code,
    calories: Math.round(calories),
    proteinG: Math.round(proteinG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    carbsG: Math.round(carbsG * 10) / 10,
    nutrients,
  };
}

export async function lookupOpenFoodFacts(
  query: string,
): Promise<NutritionLookupResult | null> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set("fields", "product_name,nutriments,code");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "NZMealTracker/1.0 (personal)" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    products?: {
      product_name?: string;
      code?: string;
      nutriments?: Record<string, unknown>;
    }[];
  };

  const products = data.products ?? [];
  if (products.length === 0) return null;

  const ranked = products
    .map((p) => ({
      p,
      score:
        scoreNameMatch(query, p.product_name ?? "") -
        (isCompoundProduct(p.product_name ?? "") ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { p } of ranked) {
    const mapped = mapOffProduct(p, query);
    if (mapped) return mapped;
  }

  return null;
}
