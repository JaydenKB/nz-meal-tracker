import { describe, expect, it } from "vitest";
import { scoreReferenceFood } from "./healthScore";

describe("calculateHealthScore reference foods", () => {
  it("ranks grilled chicken above a high-sodium processed ready meal", () => {
    const chicken = scoreReferenceFood(
      { calories: 165, proteinG: 31, fatG: 3.6, carbsG: 0 },
      { sodiumMg: 74, saturatedFatG: 1 },
      { isProcessed: false, mealType: "dinner" },
    );

    const readyMeal = scoreReferenceFood(
      { calories: 420, proteinG: 18, fatG: 14, carbsG: 48 },
      { sodiumMg: 1100, saturatedFatG: 8, sugarG: 14, fiberG: 2 },
      { isProcessed: true, mealType: "dinner" },
    );

    expect(chicken.final).toBeGreaterThan(readyMeal.final);
    expect(readyMeal.final).toBeLessThan(72);
    expect(readyMeal.penalties.some((p) => p.key === "sodium")).toBe(true);
  });

  it("does not treat olive oil as junk food", () => {
    const oliveOil = scoreReferenceFood(
      { calories: 120, proteinG: 0, fatG: 14, carbsG: 0 },
      {},
      { isProcessed: false, mealType: "default" },
    );

    expect(oliveOil.final).toBeGreaterThan(35);
    expect(oliveOil.components.find((c) => c.key === "nutrientPerCalorie")!.points).toBeGreaterThan(8);
  });

  it("scores green salad modestly with low protein component", () => {
    const salad = scoreReferenceFood(
      { calories: 40, proteinG: 1, fatG: 0.2, carbsG: 7 },
      { fiberG: 3, vitaminCMg: 20, potassiumMg: 200 },
      { mealType: "snack" },
    );

    const protein = salad.components.find((c) => c.key === "proteinDensity")!;
    expect(protein.points / protein.maxPoints).toBeLessThan(0.5);
    expect(salad.final).toBeGreaterThan(25);
  });

  it("scores white rice modestly", () => {
    const rice = scoreReferenceFood(
      { calories: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 },
      {},
      { mealType: "default" },
    );

    expect(rice.final).toBeGreaterThan(20);
    expect(rice.final).toBeLessThan(70);
  });

  it("uses base minus penalties, not a flat average", () => {
    const highProteinHighSodium = scoreReferenceFood(
      { calories: 500, proteinG: 45, fatG: 12, carbsG: 30 },
      { sodiumMg: 950, fiberG: 6 },
      { isProcessed: false, mealType: "dinner" },
    );

    expect(highProteinHighSodium.base).toBeGreaterThan(60);
    expect(highProteinHighSodium.totalPenalties).toBeGreaterThan(0);
    expect(highProteinHighSodium.final).toBeLessThan(highProteinHighSodium.base);
    expect(highProteinHighSodium.final).toBeLessThanOrEqual(62);
  });

  it("does not heavily penalise a light snack for low calories", () => {
    const snack = scoreReferenceFood(
      { calories: 180, proteinG: 8, fatG: 6, carbsG: 22 },
      { fiberG: 4 },
      { mealType: "snack" },
    );

    const nutrient = snack.components.find((c) => c.key === "nutrientPerCalorie")!;
    expect(nutrient.points / nutrient.maxPoints).toBeGreaterThan(0.35);
  });

  it("returns a deterministic summary", () => {
    const result = scoreReferenceFood(
      { calories: 480, proteinG: 42, fatG: 10, carbsG: 35 },
      { sodiumMg: 720, fiberG: 8 },
      { isProcessed: false, mealType: "dinner" },
    );

    expect(result.summary.length).toBeGreaterThan(5);
    expect(result.components).toHaveLength(5);
  });
});
