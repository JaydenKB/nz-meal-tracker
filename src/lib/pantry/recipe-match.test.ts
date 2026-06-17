import { describe, expect, it } from "vitest";
import { mlPerGramFromDensity } from "@/lib/nutrition/units";
import {
  buildShortfallSummary,
  classifyCookability,
  matchRecipeLinesToPantry,
} from "@/lib/pantry/recipe-match";
import type { PantryRow } from "@/lib/pantry/queries";
import type { Ingredient } from "@/lib/db/schema";

function ing(partial: Partial<Ingredient> & { id: number; name: string }): Ingredient {
  return {
    defaultUnit: "g",
    calories: 100,
    proteinG: 10,
    fatG: 2,
    carbsG: 5,
    isProcessed: false,
    nutrientsJson: null,
    nutritionSource: null,
    canonicalUnit: "g",
    gramsPerUnit: null,
    mlPerGram: null,
    barcode: null,
    archivedAt: null,
    ...partial,
  };
}

function pantryRow(
  ingredient: Ingredient,
  quantity: number,
  isStaple = false,
): PantryRow {
  return {
    id: ingredient.id,
    ingredientId: ingredient.id,
    quantity,
    unit: "g",
    isStaple,
    lowThreshold: null,
    updatedAt: new Date().toISOString(),
    ingredient,
  };
}

describe("classifyCookability", () => {
  it("classifies gap counts", () => {
    expect(classifyCookability(0)).toBe("cook_now");
    expect(classifyCookability(1)).toBe("almost");
    expect(classifyCookability(2)).toBe("almost");
    expect(classifyCookability(3)).toBe("not_yet");
  });
});

describe("matchRecipeLinesToPantry", () => {
  it("marks cook now when enough stock", () => {
    const chicken = ing({ id: 1, name: "Chicken breast" });
    const map = new Map([[1, pantryRow(chicken, 500)]]);
    const { gapCount, lines } = matchRecipeLinesToPantry(
      [{ quantity: 200, unit: "g", ingredient: chicken }],
      map,
    );
    expect(gapCount).toBe(0);
    expect(lines[0].status).toBe("satisfied");
  });

  it("marks short when partial stock", () => {
    const chicken = ing({ id: 1, name: "Chicken breast" });
    const map = new Map([[1, pantryRow(chicken, 50)]]);
    const { gapCount, lines } = matchRecipeLinesToPantry(
      [{ quantity: 200, unit: "g", ingredient: chicken }],
      map,
    );
    expect(gapCount).toBe(1);
    expect(lines[0].status).toBe("short");
  });

  it("does not count staples toward gaps", () => {
    const salt = ing({ id: 2, name: "Salt" });
    const map = new Map([[2, pantryRow(salt, 0, true)]]);
    const { gapCount, lines } = matchRecipeLinesToPantry(
      [{ quantity: 5, unit: "g", ingredient: salt }],
      map,
    );
    expect(gapCount).toBe(0);
    expect(lines[0].status).toBe("staple_ok");
  });

  it("treats uncertain conversion as non-blocking", () => {
    const ginger = ing({ id: 3, name: "Fresh ginger", defaultUnit: "g" });
    const map = new Map<number, PantryRow>();
    const { gapCount, lines } = matchRecipeLinesToPantry(
      [{ quantity: 1, unit: "thumb", ingredient: ginger }],
      map,
    );
    expect(gapCount).toBe(0);
    expect(lines[0].status).toBe("uncertain");
  });

  it("compares volume lines with density", () => {
    const oil = ing({
      id: 4,
      name: "Olive oil",
      defaultUnit: "ml",
      mlPerGram: mlPerGramFromDensity(0.91),
      canonicalUnit: "ml",
    });
    const map = new Map([[4, pantryRow({ ...oil, defaultUnit: "ml" }, 500)]]);
    oil.canonicalUnit = "ml";
    const row = pantryRow(oil, 500);
    row.unit = "ml";
    const map2 = new Map([[4, row]]);
    const { gapCount, lines } = matchRecipeLinesToPantry(
      [{ quantity: 1, unit: "tbsp", ingredient: oil }],
      map2,
    );
    expect(gapCount).toBe(0);
    expect(lines[0].status).toBe("satisfied");
  });
});

describe("buildShortfallSummary", () => {
  it("describes missing and short items", () => {
    const summary = buildShortfallSummary([
      {
        ingredientId: 1,
        ingredientName: "Salmon fillet",
        quantity: 600,
        unit: "g",
        status: "missing",
        requiredCanonical: 600,
        requiredUnit: "g",
        onHandCanonical: 0,
        onHandDisplay: "0g",
        requiredDisplay: "600g",
        shortfallCanonical: 600,
        shortfallDisplay: "600g",
        isStaple: false,
      },
      {
        ingredientId: 2,
        ingredientName: "Spinach",
        quantity: 100,
        unit: "g",
        status: "short",
        requiredCanonical: 100,
        requiredUnit: "g",
        onHandCanonical: 40,
        onHandDisplay: "40g",
        requiredDisplay: "100g",
        shortfallCanonical: 60,
        shortfallDisplay: "60g",
        isStaple: false,
      },
    ]);
    expect(summary).toContain("missing salmon");
    expect(summary).toContain("low on spinach");
  });
});
