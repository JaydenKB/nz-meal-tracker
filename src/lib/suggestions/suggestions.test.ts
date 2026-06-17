import { describe, expect, it } from "vitest";
import { scoreReferenceFood } from "@/lib/nutrition/healthScore";
import { generateRuleBasedSuggestions } from "@/lib/suggestions/generate";
import type { SimLine } from "@/lib/suggestions/simulate";
import { inferSuggestionAction } from "@/lib/suggestions/infer";
import { simulateAndScore } from "@/lib/suggestions/score";

function simLine(partial: Omit<import("@/lib/suggestions/simulate").SimLine, "canonicalUnit" | "mlPerGram" | "gramsPerUnit" | "name"> & {
  name?: string;
  canonicalUnit?: string | null;
  mlPerGram?: number | null;
  gramsPerUnit?: number | null;
}): import("@/lib/suggestions/simulate").SimLine {
  return {
    canonicalUnit: null,
    mlPerGram: null,
    gramsPerUnit: null,
    name: "test",
    ...partial,
  };
}

describe("inferSuggestionAction", () => {
  it("detects swap and reduce from text", () => {
    expect(inferSuggestionAction("Swap white rice for brown rice")).toBe("swap");
    expect(inferSuggestionAction("Reduce soy sauce to 10ml")).toBe("adjust");
    expect(inferSuggestionAction("Add 80g spinach")).toBe("add");
  });
});

describe("generateRuleBasedSuggestions", () => {
  it("only returns suggestions with positive score delta", () => {
    const highSodiumMeal = scoreReferenceFood(
      { calories: 420, proteinG: 18, fatG: 14, carbsG: 48 },
      { sodiumMg: 1100, saturatedFatG: 8, sugarG: 14, fiberG: 2 },
      { isProcessed: true, mealType: "dinner" },
    );

    const baseLines: SimLine[] = [
      simLine({
        ingredientId: 1,
        quantity: 400,
        unit: "g",
        isProcessed: true,
        calories: 105,
        proteinG: 4.5,
        fatG: 3.3,
        carbsG: 12,
        defaultUnit: "g",
        nutrientsJson: JSON.stringify({ sodiumMg: 275, sugarG: 3.5, saturatedFatG: 2 }),
      }),
      simLine({
        ingredientId: 2,
        quantity: 150,
        unit: "g",
        isProcessed: false,
        calories: 165,
        proteinG: 31,
        fatG: 3.6,
        carbsG: 0,
        defaultUnit: "g",
        nutrientsJson: JSON.stringify({ sodiumMg: 74 }),
      }),
    ];

    const suggestions = generateRuleBasedSuggestions({
      baseLines,
      servings: 1,
      currentScore: highSodiumMeal.final,
      healthScore: highSodiumMeal,
      ingredientMap: new Map([
        [
          1,
          {
            id: 1,
            name: "Processed sauce",
            defaultUnit: "g",
            calories: 105,
            proteinG: 4.5,
            fatG: 3.3,
            carbsG: 12,
            isProcessed: true,
            nutrientsJson: JSON.stringify({ sodiumMg: 275 }),
            nutritionSource: null,
            canonicalUnit: null,
            gramsPerUnit: null,
            mlPerGram: null,
          },
        ],
        [
          2,
          {
            id: 2,
            name: "Chicken breast",
            defaultUnit: "g",
            calories: 165,
            proteinG: 31,
            fatG: 3.6,
            carbsG: 0,
            isProcessed: false,
            nutrientsJson: JSON.stringify({ sodiumMg: 74 }),
            nutritionSource: null,
            canonicalUnit: null,
            gramsPerUnit: null,
            mlPerGram: null,
          },
        ],
        [
          3,
          {
            id: 3,
            name: "Spinach",
            defaultUnit: "g",
            calories: 23,
            proteinG: 2.9,
            fatG: 0.4,
            carbsG: 3.6,
            isProcessed: false,
            nutrientsJson: JSON.stringify({ fiberG: 2.2, vitaminCMg: 28 }),
            nutritionSource: null,
            canonicalUnit: null,
            gramsPerUnit: null,
            mlPerGram: null,
          },
        ],
      ]),
      lineNames: new Map([
        [1, "Processed sauce"],
        [2, "Chicken breast"],
      ]),
      allIngredients: [
        {
          id: 3,
          name: "Spinach",
          defaultUnit: "g",
          calories: 23,
          proteinG: 2.9,
          fatG: 0.4,
          carbsG: 3.6,
          isProcessed: false,
          nutrientsJson: JSON.stringify({ fiberG: 2.2, vitaminCMg: 28 }),
          nutritionSource: null,
          canonicalUnit: null,
          gramsPerUnit: null,
          mlPerGram: null,
        },
      ],
    });

    expect(suggestions.length).toBeGreaterThan(0);
    for (const s of suggestions) {
      expect(s.computed_delta).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("simulateAndScore", () => {
  it("scores sodium reduction higher than before", () => {
    const baseLines: SimLine[] = [
      simLine({
        ingredientId: 1,
        quantity: 30,
        unit: "ml",
        isProcessed: true,
        calories: 50,
        proteinG: 1,
        fatG: 0,
        carbsG: 10,
        defaultUnit: "ml",
        nutrientsJson: JSON.stringify({ sodiumMg: 6000 }),
      }),
    ];

    const ingredientMap = new Map([
      [
        1,
        {
          id: 1,
          name: "Soy sauce",
          defaultUnit: "ml",
          calories: 50,
          proteinG: 1,
          fatG: 0,
          carbsG: 10,
          isProcessed: true,
          nutrientsJson: JSON.stringify({ sodiumMg: 6000 }),
          nutritionSource: null,
          canonicalUnit: null,
          gramsPerUnit: null,
          mlPerGram: null,
        },
      ],
    ]);

    const before = simulateAndScore(baseLines, { change: "", reason: "", score_delta: 0 }, 1, 0, ingredientMap);
    const after = simulateAndScore(
      baseLines,
      {
        change: "Reduce soy sauce",
        reason: "test",
        score_delta: 0,
        action: "adjust",
        ingredient_id: 1,
        quantity: 15,
        unit: "ml",
      },
      1,
      before.afterScore,
      ingredientMap,
    );

    expect(after.delta).toBeGreaterThan(0);
  });
});
