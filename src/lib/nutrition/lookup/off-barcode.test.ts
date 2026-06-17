import { describe, expect, it } from "vitest";
import { normalizeBarcode, isSparseDraft } from "@/lib/nutrition/lookup/off-barcode";
import {
  packageSizeToGrams,
  parsePackageQuantity,
} from "@/lib/nutrition/lookup/parse-package-quantity";

describe("normalizeBarcode", () => {
  it("strips non-digits", () => {
    expect(normalizeBarcode("9400 5400 0423 1")).toBe("9400540004231");
  });

  it("rejects too short", () => {
    expect(normalizeBarcode("12345")).toBeNull();
  });
});

describe("parsePackageQuantity", () => {
  it("parses simple grams", () => {
    expect(parsePackageQuantity("420 g")).toEqual({ size: 420, unit: "g" });
  });

  it("parses multi-pack", () => {
    expect(parsePackageQuantity("6 x 330 ml")).toEqual({ size: 1980, unit: "ml" });
  });

  it("converts kg to grams storage", () => {
    expect(packageSizeToGrams(1, "kg")).toBe(1000);
  });
});

describe("isSparseDraft", () => {
  it("flags empty nutrition", () => {
    expect(
      isSparseDraft({
        barcode: "1",
        name: "Test",
        packageSize: 100,
        packageUnit: "g",
        calories: null,
        proteinG: null,
        fatG: null,
        carbsG: null,
        isProcessed: true,
        nutritionSource: "openfoodfacts",
        missingFields: ["calories"],
      }),
    ).toBe(true);
  });
});
