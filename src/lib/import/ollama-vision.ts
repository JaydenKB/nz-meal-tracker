import type { RawScannedItem } from "./types";
import { toGrams } from "./types";
import {
  assertOllamaModel,
  connectionError,
  OLLAMA_KEEP_ALIVE,
  ollamaFetch,
  parseOllamaHttpError,
} from "@/lib/ollama/client";

export function buildScanPrompt(storeName: string, singleImage = false): string {
  const scope = singleImage
    ? "Extract EVERY distinct grocery product visible in THIS screenshot."
    : "Extract EVERY distinct grocery product visible across the images.";

  return `You are reading supermarket product screenshots from ${storeName} in Auckland, New Zealand.

${scope} For each product read:
- Product name (as shown on packaging or listing)
- Package size in grams (convert kg→g, ml→g equivalent)
- Price in NZD if visible (null if unreadable)
- Nutrition per 100g OR per 100ml: calories (kcal), protein (g), fat (g), carbs (g)
- Whether it is a processed/packaged food (true/false)

If price is partially visible or uncertain, set priceUnclear to true and priceNzd to null.
Nutrition values must be per 100g — convert if the label shows per serving or per package.
Always set packageUnit to "g" and packageSize as an integer gram weight.

Respond with ONLY valid JSON, no markdown:
{
  "items": [
    {
      "name": "Free Range Chicken Breast",
      "packageSize": 500,
      "packageUnit": "g",
      "priceNzd": 11.50,
      "priceUnclear": false,
      "calories": 110,
      "proteinG": 23,
      "fatG": 1.5,
      "carbsG": 0,
      "isProcessed": false
    }
  ]
}`;
}

function stripBase64Prefix(data: string): string {
  const idx = data.indexOf(",");
  return idx >= 0 ? data.slice(idx + 1) : data;
}

export function parseScanJson(raw: string): RawScannedItem[] {
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

  return arr.map(normalizeRawItem);
}

function normalizeRawItem(item: unknown): RawScannedItem {
  if (!item || typeof item !== "object") throw new Error("Invalid item");
  const o = item as Record<string, unknown>;
  const priceUnclear = Boolean(o.priceUnclear);
  const priceRaw = o.priceNzd ?? o.price;

  return {
    name: String(o.name ?? "Unknown product").trim(),
    packageSize: toGrams(
      Math.max(0, Number(o.packageSize ?? o.size ?? 0)),
      String(o.packageUnit ?? o.unit ?? "g"),
    ),
    packageUnit: "g",
    priceNzd: priceUnclear || priceRaw == null ? null : Number(priceRaw),
    priceUnclear,
    calories: Number(o.calories ?? o.caloriesPer100g ?? 0),
    proteinG: Number(o.proteinG ?? o.protein ?? 0),
    fatG: Number(o.fatG ?? o.fat ?? 0),
    carbsG: Number(o.carbsG ?? o.carbs ?? 0),
    isProcessed: Boolean(o.isProcessed ?? false),
  };
}

export async function callOllamaVision(
  baseUrl: string,
  model: string,
  prompt: string,
  images: string[],
): Promise<string> {
  await assertOllamaModel(baseUrl, model);

  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const encoded = images.map(stripBase64Prefix);

  let res: Response;
  try {
    res = await ollamaFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt, images: encoded }],
        stream: false,
        format: "json",
        keep_alive: OLLAMA_KEEP_ALIVE,
      }),
    });
  } catch (error) {
    throw connectionError(baseUrl, error);
  }

  if (!res.ok) {
    throw await parseOllamaHttpError(res, baseUrl, model);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) throw new Error("Empty response from Ollama vision");
  return content;
}

export async function scanSingleImageWithRetry(
  baseUrl: string,
  model: string,
  storeName: string,
  image: string,
): Promise<RawScannedItem[]> {
  const prompt = buildScanPrompt(storeName, true);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callOllamaVision(baseUrl, model, prompt, [image]);
      return parseScanJson(raw);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("Scan parse failed");
    }
  }

  throw lastError ?? new Error("Failed to scan screenshot");
}

/** @deprecated Prefer scanSingleImageWithRetry per image for live progress */
export async function scanImagesWithRetry(
  baseUrl: string,
  model: string,
  storeName: string,
  images: string[],
): Promise<RawScannedItem[]> {
  const all: RawScannedItem[] = [];
  for (const image of images) {
    const items = await scanSingleImageWithRetry(baseUrl, model, storeName, image);
    all.push(...items);
  }
  return all;
}
