import type { Ingredient } from "@/lib/db/schema";
import { calculateLineNutrients } from "@/lib/nutrition/calculate";
import type { HealthScoreResult } from "@/lib/nutrition/healthScore";
import type { SuggestionAction } from "@/lib/suggestions/ollama";
import { simulateAndScore } from "@/lib/suggestions/score";
import type { SimLine } from "@/lib/suggestions/simulate";

const PROTEIN_BOOSTER_PATTERNS = [
  "chicken breast",
  "chicken",
  "turkey",
  "tofu",
  "lentil",
  "chickpea",
  "egg",
  "yoghurt",
  "yogurt",
  "cottage cheese",
  "salmon",
  "tuna",
  "prawn",
  "bean",
];

const GREENS_PATTERNS = [
  "spinach",
  "kale",
  "broccoli",
  "silverbeet",
  "cabbage",
  "lettuce",
  "salad",
  "green bean",
  "peas",
  "asparagus",
];

type LineInfo = {
  line: SimLine;
  name: string;
  sodiumPerServing: number;
  sugarPerServing: number;
  satFatPerServing: number;
  proteinPerServing: number;
};

function lineInfo(line: SimLine, name: string, servings: number): LineInfo {
  const nutrients = calculateLineNutrients({
    quantity: line.quantity,
    unit: line.unit,
    ingredient: line,
  });
  const s = Math.max(servings, 1);
  const macroFactor = line.defaultUnit === "each" ? line.quantity : line.quantity / 100;
  return {
    line,
    name,
    sodiumPerServing: (nutrients.sodiumMg ?? 0) / s,
    sugarPerServing: (nutrients.sugarG ?? 0) / s,
    satFatPerServing: (nutrients.saturatedFatG ?? 0) / s,
    proteinPerServing: (line.proteinG * macroFactor) / s,
  };
}

function findByPatterns(ingredients: Ingredient[], patterns: string[]): Ingredient[] {
  return ingredients.filter((i) => {
    const lower = i.name.toLowerCase();
    return patterns.some((p) => lower.includes(p));
  });
}

function ingredientName(id: number, names: Map<number, string>): string {
  return names.get(id) ?? `ingredient ${id}`;
}

function roundQty(q: number, unit: string): number {
  if (unit === "each") return Math.max(0.5, Math.round(q * 2) / 2);
  return Math.max(5, Math.round(q / 5) * 5);
}

function buildReduceCandidates(
  info: LineInfo,
  factor: number,
  reason: string,
): SuggestionAction {
  const newQty = roundQty(info.line.quantity * factor, info.line.unit);
  return {
    change: `Reduce ${info.name} to ${newQty}${info.line.unit}`,
    reason,
    score_delta: 0,
    action: "adjust",
    ingredient_id: info.line.ingredientId,
    quantity: newQty,
    unit: info.line.unit,
  };
}

function buildAddCandidate(ing: Ingredient, quantity: number, reason: string): SuggestionAction {
  const qty = roundQty(quantity, ing.defaultUnit);
  return {
    change: `Add ${qty}${ing.defaultUnit} ${ing.name}`,
    reason,
    score_delta: 0,
    action: "add",
    new_ingredient_id: ing.id,
    quantity: qty,
    unit: ing.defaultUnit,
  };
}

function buildIncreaseCandidate(info: LineInfo, factor: number, reason: string): SuggestionAction {
  const newQty = roundQty(info.line.quantity * factor, info.line.unit);
  return {
    change: `Increase ${info.name} to ${newQty}${info.line.unit}`,
    reason,
    score_delta: 0,
    action: "adjust",
    ingredient_id: info.line.ingredientId,
    quantity: newQty,
    unit: info.line.unit,
  };
}

function buildSwapCandidate(from: LineInfo, to: Ingredient, reason: string): SuggestionAction {
  return {
    change: `Swap ${from.name} for ${to.name}`,
    reason,
    score_delta: 0,
    action: "swap",
    ingredient_id: from.line.ingredientId,
    new_ingredient_id: to.id,
  };
}

function buildRemoveCandidate(info: LineInfo, reason: string): SuggestionAction {
  return {
    change: `Remove ${info.name}`,
    reason,
    score_delta: 0,
    action: "remove",
    ingredient_id: info.line.ingredientId,
  };
}

function parseNutrients(ing: Ingredient) {
  try {
    return ing.nutrientsJson ? (JSON.parse(ing.nutrientsJson) as { sodiumMg?: number }) : {};
  } catch {
    return {};
  }
}

function pickBestUnprocessedSwap(
  from: LineInfo,
  allIngredients: Ingredient[],
  recipeIngredientIds: Set<number>,
): Ingredient | null {
  const fromWords = from.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const candidates = allIngredients.filter(
    (i) =>
      !i.isProcessed &&
      i.id !== from.line.ingredientId &&
      !recipeIngredientIds.has(i.id) &&
      i.calories > 0,
  );

  const scored = candidates
    .map((i) => {
      const n = parseNutrients(i);
      const nameLower = i.name.toLowerCase();
      let nameScore = 0;
      for (const w of fromWords) {
        if (nameLower.includes(w)) nameScore += 2;
      }
      const sodium = n.sodiumMg ?? 999;
      return { ing: i, nameScore, sodium };
    })
    .filter((c) => c.nameScore > 0 || from.line.isProcessed)
    .sort((a, b) => b.nameScore - a.nameScore || a.sodium - b.sodium);

  return scored[0]?.ing ?? null;
}

export type ScoredSuggestion = SuggestionAction & {
  computed_delta: number;
  afterScore: number;
};

export function generateRuleBasedSuggestions(input: {
  baseLines: SimLine[];
  servings: number;
  currentScore: number;
  healthScore: HealthScoreResult;
  ingredientMap: Map<number, Ingredient>;
  lineNames: Map<number, string>;
  allIngredients: Ingredient[];
}): ScoredSuggestion[] {
  const {
    baseLines,
    servings,
    currentScore,
    healthScore,
    ingredientMap,
    lineNames,
    allIngredients,
  } = input;

  const recipeIngredientIds = new Set(baseLines.map((l) => l.ingredientId));
  const lineInfos = baseLines.map((l) =>
    lineInfo(l, ingredientName(l.ingredientId, lineNames), servings),
  );

  const topPenalty = [...healthScore.penalties].sort((a, b) => b.points - a.points)[0];
  const weakest = [...healthScore.components].sort(
    (a, b) => a.points / a.maxPoints - b.points / b.maxPoints,
  )[0];

  const candidates: SuggestionAction[] = [];

  if (topPenalty?.key === "sodium" || healthScore.penalties.some((p) => p.key === "sodium")) {
    const bySodium = [...lineInfos].sort((a, b) => b.sodiumPerServing - a.sodiumPerServing);
    for (const info of bySodium.slice(0, 2)) {
      if (info.sodiumPerServing < 30) continue;
      candidates.push(
        buildReduceCandidates(
          info,
          0.75,
          "Less sodium per serving — directly addresses the score penalty",
        ),
      );
      candidates.push(
        buildReduceCandidates(
          info,
          0.5,
          "Cut back a high-sodium ingredient to recover health score points",
        ),
      );
    }
  }

  if (healthScore.penalties.some((p) => p.key === "saturatedFat")) {
    const bySat = [...lineInfos].sort((a, b) => b.satFatPerServing - a.satFatPerServing);
    const top = bySat[0];
    if (top && top.satFatPerServing > 1) {
      candidates.push(
        buildReduceCandidates(top, 0.75, "Lower saturated fat to reduce the score penalty"),
      );
    }
  }

  if (healthScore.penalties.some((p) => p.key === "sugar")) {
    const bySugar = [...lineInfos].sort((a, b) => b.sugarPerServing - a.sugarPerServing);
    const top = bySugar[0];
    if (top && top.sugarPerServing > 2) {
      candidates.push(
        buildReduceCandidates(top, 0.75, "Less added sugar improves the health score"),
      );
    }
  }

  const processedLines = lineInfos.filter((i) => i.line.isProcessed);
  for (const info of processedLines.slice(0, 2)) {
    const swap = pickBestUnprocessedSwap(info, allIngredients, recipeIngredientIds);
    if (swap) {
      candidates.push(
        buildSwapCandidate(info, swap, "Swap to a less processed option — boosts whole-food ratio"),
      );
    }
    if (processedLines.length > 1 || info.line.quantity > 20) {
      candidates.push(
        buildReduceCandidates(info, 0.5, "Use less of this processed ingredient"),
      );
    }
  }

  if (weakest?.key === "proteinDensity") {
    const byProtein = [...lineInfos]
      .filter((i) => !i.line.isProcessed && i.proteinPerServing > 0)
      .sort((a, b) => b.proteinPerServing - a.proteinPerServing);
    const top = byProtein[0];
    if (top) {
      candidates.push(
        buildIncreaseCandidate(top, 1.2, "More lean protein per serving strengthens protein density"),
      );
    }
    const boosters = findByPatterns(allIngredients, PROTEIN_BOOSTER_PATTERNS).filter(
      (i) => !recipeIngredientIds.has(i.id) && !i.isProcessed,
    );
    for (const ing of boosters.slice(0, 4)) {
      candidates.push(
        buildAddCandidate(ing, 80, "Adds lean protein — verified against the health score"),
      );
      candidates.push(
        buildAddCandidate(ing, 50, "Small protein boost — verified against the health score"),
      );
    }
  }

  if (
    weakest?.key === "micronutrients" ||
    weakest?.key === "wholeFoodRatio" ||
    weakest?.key === "nutrientPerCalorie"
  ) {
    const greens = findByPatterns(allIngredients, GREENS_PATTERNS).filter(
      (i) => !recipeIngredientIds.has(i.id),
    );
    for (const ing of greens.slice(0, 4)) {
      candidates.push(
        buildAddCandidate(
          ing,
          60,
          "Extra veg adds fibre and micronutrients with minimal score downside",
        ),
      );
    }
  }

  for (const info of lineInfos) {
    if (info.line.isProcessed && info.line.quantity <= 30 && lineInfos.length > 2) {
      candidates.push(
        buildRemoveCandidate(info, "Drop optional processed garnish if it hurts the score"),
      );
    }
  }

  const seen = new Set<string>();
  const scored: ScoredSuggestion[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.action}:${candidate.ingredient_id ?? ""}:${candidate.new_ingredient_id ?? ""}:${candidate.quantity ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const result = simulateAndScore(
      baseLines,
      candidate,
      servings,
      currentScore,
      ingredientMap,
    );

    if (result.delta < 1) continue;

    scored.push({
      ...candidate,
      action: candidate.action ?? "adjust",
      computed_delta: Math.round(result.delta),
      afterScore: result.afterScore,
      score_delta: Math.round(result.delta),
    });
  }

  scored.sort((a, b) => b.computed_delta - a.computed_delta);

  const diverse: ScoredSuggestion[] = [];
  const usedActions = new Set<string>();
  for (const s of scored) {
    const bucket = `${s.action}:${s.ingredient_id ?? s.new_ingredient_id}`;
    if (usedActions.has(bucket) && diverse.length >= 2) continue;
    usedActions.add(bucket);
    diverse.push(s);
    if (diverse.length >= 4) break;
  }

  return diverse.length > 0 ? diverse : scored.slice(0, 4);
}
