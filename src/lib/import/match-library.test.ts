import { describe, expect, it } from "vitest";
import type { Ingredient } from "@/lib/db/schema";
import type { DetectedGrocery } from "@/lib/import/grocery-detect";
import { matchDetectedToLibrary } from "@/lib/import/match-library";

function ing(id: number, name: string): Ingredient {
  return {
    id,
    name,
    defaultUnit: "g",
    calories: 0,
    proteinG: 0,
    fatG: 0,
    carbsG: 0,
    isProcessed: false,
    nutrientsJson: null,
    nutritionSource: null,
    canonicalUnit: "g",
    gramsPerUnit: null,
    mlPerGram: null,
    barcode: null,
  };
}

const library = [
  ing(1, "Chicken breast"),
  ing(2, "Chicken thigh"),
  ing(3, "Butter"),
  ing(4, "Baby spinach"),
  ing(5, "Tahini"),
];

function detect(name: string, confidence: DetectedGrocery["confidence"] = "high"): DetectedGrocery {
  return { guessName: name, confidence };
}

describe("matchDetectedToLibrary", () => {
  it("matches store-prefixed chicken breast", () => {
    const result = matchDetectedToLibrary(
      detect("Woolworths Free Range Chicken Breast 500g"),
      library,
    );
    expect(result.bucket).toBe("matched");
    expect(result.ingredientId).toBe(1);
  });

  it("does not match chicken thigh to chicken breast", () => {
    const result = matchDetectedToLibrary(detect("Chicken thigh"), library);
    expect(result.ingredientId).not.toBe(1);
    if (result.bucket === "not_sure") {
      expect(result.bestGuessId).not.toBe(1);
    }
  });

  it("marks unknown product as new", () => {
    const result = matchDetectedToLibrary(detect("Obscure artisan paste"), library);
    expect(result.bucket).toBe("new");
    expect(result.ingredientId).toBeNull();
  });

  it("puts medium-confidence fuzzy match in not_sure", () => {
    const result = matchDetectedToLibrary(
      detect("Leafy green?", "medium"),
      library,
    );
    expect(["not_sure", "new"]).toContain(result.bucket);
  });

  it("matches butter with high confidence", () => {
    const result = matchDetectedToLibrary(detect("Anchor Butter 500g"), library);
    expect(result.bucket).toBe("matched");
    expect(result.ingredientId).toBe(3);
  });
});

describe("parseGroceryDetectJson", () => {
  it("parses fenced JSON", async () => {
    const { parseGroceryDetectJson } = await import("@/lib/import/grocery-detect");
    const raw = '```json\n{"items":[{"guess_name":"Butter","confidence":"high"}]}\n```';
    const items = parseGroceryDetectJson(raw);
    expect(items).toHaveLength(1);
    expect(items[0].guessName).toBe("Butter");
  });
});
