export type VisionConfidence = "high" | "medium" | "low";

export type DetectedGrocery = {
  guessName: string;
  brand?: string;
  packageSize?: number;
  packageUnit?: string;
  confidence: VisionConfidence;
};

export function buildGroceryDetectPrompt(): string {
  return `You are identifying distinct grocery products visible in a photo of real food items (not a screenshot).

List EACH separate product you can see — packaged foods, produce, meat, dairy, etc.
Be honest about uncertainty: cluttered photos often hide labels or overlap items.

For each product return:
- guess_name: short product name (core food noun, e.g. "Chicken breast", "Baby spinach", "Tahini")
- brand: brand if readable, else omit
- package_size: numeric size if visible (e.g. 500, 300, 1)
- package_unit: g, kg, ml, l, each, jar, pack, etc.
- confidence: "high" if label/name is clear, "medium" if plausible guess, "low" if very uncertain

Do NOT invent items you cannot see. Do NOT merge two products into one.
This is a DRAFT for user review — prefer fewer confident items over many guesses.

Respond with ONLY valid JSON, no markdown:
{
  "items": [
    {
      "guess_name": "Chicken breast",
      "brand": "Tegel",
      "package_size": 500,
      "package_unit": "g",
      "confidence": "high"
    }
  ]
}`;
}

export function parseGroceryDetectJson(raw: string): DetectedGrocery[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const parsed = JSON.parse(text) as unknown;
  const arr =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && "items" in parsed
        ? (parsed as { items: unknown }).items
        : null;

  if (!Array.isArray(arr)) throw new Error("Expected JSON with an items array");

  return arr.map(normalizeGroceryItem).filter((item) => item.guessName.length >= 2);
}

function normalizeGroceryItem(item: unknown): DetectedGrocery {
  if (!item || typeof item !== "object") throw new Error("Invalid grocery item");
  const o = item as Record<string, unknown>;

  const guessName = String(o.guess_name ?? o.guessName ?? o.name ?? "").trim();
  const brandRaw = o.brand;
  const brand = typeof brandRaw === "string" && brandRaw.trim() ? brandRaw.trim() : undefined;

  const sizeRaw = o.package_size ?? o.packageSize ?? o.size;
  const packageSize =
    sizeRaw != null && Number.isFinite(Number(sizeRaw)) && Number(sizeRaw) > 0
      ? Number(sizeRaw)
      : undefined;

  const unitRaw = o.package_unit ?? o.packageUnit ?? o.unit;
  const packageUnit =
    typeof unitRaw === "string" && unitRaw.trim() ? unitRaw.trim().toLowerCase() : undefined;

  const confRaw = String(o.confidence ?? "medium").toLowerCase();
  const confidence: VisionConfidence =
    confRaw === "high" || confRaw === "low" ? confRaw : "medium";

  return { guessName, brand, packageSize, packageUnit, confidence };
}
