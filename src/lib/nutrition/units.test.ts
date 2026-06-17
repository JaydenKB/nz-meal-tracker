import { describe, expect, it } from "vitest";
import {
  convert,
  convertQuantity,
  densityGPerMlFromIngredient,
  mlPerGramFromDensity,
  NZ_KITCHEN_VOLUME,
  toGrams,
  toMilliliters,
} from "./units";

const oliveOil = {
  defaultUnit: "ml",
  mlPerGram: mlPerGramFromDensity(0.91),
  name: "Olive oil",
};

const honey = {
  defaultUnit: "g",
  mlPerGram: mlPerGramFromDensity(1.42),
  name: "Honey",
};

const flour = {
  defaultUnit: "g",
  mlPerGram: mlPerGramFromDensity(0.53),
  name: "Plain flour",
};

const water = {
  defaultUnit: "ml",
  mlPerGram: mlPerGramFromDensity(1.0),
  name: "Water",
};

describe("NZ kitchen volume constants", () => {
  it("uses documented tsp/tbsp/cup ml values", () => {
    expect(NZ_KITCHEN_VOLUME.tspMl).toBe(5);
    expect(NZ_KITCHEN_VOLUME.tbspMl).toBe(15);
    expect(NZ_KITCHEN_VOLUME.cupMl).toBe(240);
  });
});

describe("same-kind conversions are exact", () => {
  it("converts kg to g exactly", () => {
    expect(convertQuantity(1, "kg", "g")).toBe(1000);
    expect(convert(1, "kg", "g", {}).exact).toBe(true);
  });

  it("converts litres to ml exactly", () => {
    expect(convertQuantity(2, "l", "ml")).toBe(2000);
  });
});

describe("substance-specific volume to weight", () => {
  it("1 tbsp olive oil is lighter than water and ~12–13g", () => {
    const result = convert(1, "tbsp", "g", oliveOil);
    expect(result.exact).toBe(true);
    if (result.exact) {
      expect(result.value).toBeGreaterThan(12);
      expect(result.value).toBeLessThan(14);
    }
  });

  it("1 tbsp honey ≈ 21g", () => {
    const result = convert(1, "tbsp", "g", honey);
    expect(result.exact).toBe(true);
    if (result.exact) {
      expect(result.value).toBeGreaterThan(19);
      expect(result.value).toBeLessThan(23);
    }
  });

  it("1 tbsp flour ≈ 8g", () => {
    const result = convert(1, "tbsp", "g", flour);
    expect(result.exact).toBe(true);
    if (result.exact) {
      expect(result.value).toBeGreaterThan(7);
      expect(result.value).toBeLessThan(9);
    }
  });

  it("proves densities differ — oil, honey, flour are not the same", () => {
    const oil = convert(1, "tbsp", "g", oliveOil);
    const hon = convert(1, "tbsp", "g", honey);
    const flo = convert(1, "tbsp", "g", flour);
    if (oil.exact && hon.exact && flo.exact) {
      expect(oil.value).toBeLessThan(hon.value);
      expect(flo.value).toBeLessThan(oil.value);
    }
  });

  it("1 cup water = 240g", () => {
    const result = convert(1, "cup", "g", water);
    expect(result.exact).toBe(true);
    if (result.exact) expect(result.value).toBe(240);
  });

  it("1 cup oil ≈ 218g", () => {
    const result = convert(1, "cup", "g", oliveOil);
    expect(result.exact).toBe(true);
    if (result.exact) {
      expect(result.value).toBeGreaterThan(215);
      expect(result.value).toBeLessThan(222);
    }
  });
});

describe("count to weight", () => {
  it("1 large egg ≈ 50g when grams_per_each set", () => {
    const result = convert(1, "each", "g", { gramsPerUnit: 50, defaultUnit: "each" });
    expect(result.exact).toBe(true);
    if (result.exact) expect(result.value).toBe(50);
  });

  it("1 clove garlic ≈ 5g", () => {
    const result = convert(1, "each", "g", { gramsPerUnit: 5, defaultUnit: "g", name: "Garlic" });
    expect(result.exact).toBe(true);
    if (result.exact) expect(result.value).toBe(5);
  });
});

describe("missing density is not silently guessed", () => {
  it("returns exact:false for tbsp→g without density on ingredient", () => {
    const result = convert(1, "tbsp", "g", { defaultUnit: "g", name: "Mystery powder" });
    expect(result.exact).toBe(false);
    if (!result.exact) {
      expect(result.reason).toBe("missing_density");
      expect(result.value).toBeNull();
    }
  });

  it("does not assume 1 ml = 1 g for unknown liquids", () => {
    const ml = toMilliliters(1, "tbsp");
    const mystery = convert(1, "tbsp", "g", { defaultUnit: "ml", name: "Unknown syrup" });
    expect(mystery.exact).toBe(false);
    if (!mystery.exact) {
      expect(mystery.value).not.toBe(ml);
    }
  });
});

describe("density helpers", () => {
  it("round-trips g/ml and ml/g", () => {
    expect(densityGPerMlFromIngredient({ mlPerGram: mlPerGramFromDensity(0.91) })).toBeCloseTo(
      0.91,
      2,
    );
  });

  it("toGrams and toMilliliters use kitchen constants", () => {
    expect(toMilliliters(1, "tbsp")).toBe(NZ_KITCHEN_VOLUME.tbspMl);
    expect(toGrams(1, "kg")).toBe(1000);
  });
});
