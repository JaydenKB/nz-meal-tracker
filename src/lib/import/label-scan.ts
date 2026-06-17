import type { RawScannedItem } from "@/lib/import/types";
import { toGrams } from "@/lib/import/types";

export function buildLabelScanPrompt(hintName?: string): string {
  const hint = hintName?.trim()
    ? `The user thinks this product is "${hintName.trim()}" — use the label to confirm or correct.`
    : "Read the product name from the front label image.";

  return `You are reading a packaged food product using TWO photos:
1. FRONT label — product name, brand, net weight/size
2. BACK label — nutrition information panel

${hint}

Extract:
- Product name (clean, without store prefix)
- Package size in grams (convert kg→g; for ml use equivalent grams if liquid)
- Nutrition per 100g OR per 100ml: calories (kcal), protein (g), fat (g), carbs (g)
- Whether it is processed/packaged food (true/false)

Nutrition MUST come from the back label panel. Convert per-serving to per-100g if needed.
Set packageUnit to "g" and packageSize as integer gram weight when possible.

Respond with ONLY valid JSON, no markdown:
{
  "name": "Tahini",
  "packageSize": 300,
  "packageUnit": "g",
  "calories": 595,
  "proteinG": 17,
  "fatG": 54,
  "carbsG": 21,
  "isProcessed": true
}`;
}

export function parseLabelScanJson(raw: string): RawScannedItem {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const parsed = JSON.parse(text) as unknown;
  const o =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  if (!o) throw new Error("Expected JSON object for label scan");

  return {
    name: String(o.name ?? "Unknown product").trim(),
    packageSize: toGrams(
      Math.max(0, Number(o.packageSize ?? o.package_size ?? o.size ?? 0)),
      String(o.packageUnit ?? o.package_unit ?? o.unit ?? "g"),
    ),
    packageUnit: "g",
    priceNzd: null,
    priceUnclear: true,
    calories: Number(o.calories ?? o.caloriesPer100g ?? 0),
    proteinG: Number(o.proteinG ?? o.protein ?? 0),
    fatG: Number(o.fatG ?? o.fat ?? 0),
    carbsG: Number(o.carbsG ?? o.carbs ?? 0),
    isProcessed: Boolean(o.isProcessed ?? true),
  };
}
