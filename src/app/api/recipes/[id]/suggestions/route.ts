import { NextResponse } from "next/server";
import {
  calculateLineMacros,
  perServing,
  roundMacros,
  sumMacros,
} from "@/lib/nutrition/calculate";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import { getAppSettings } from "@/lib/log/queries";
import { getAllIngredients, getRecipeWithDetails } from "@/lib/queries";
import type { Ingredient } from "@/lib/db/schema";
import { applySuggestionToRecipe } from "@/lib/suggestions/apply";
import {
  buildSuggestionPrompt,
  fetchOllamaSuggestions,
  parseSuggestionsJson,
  type SuggestionAction,
} from "@/lib/suggestions/ollama";

export const runtime = "nodejs";

type SimLine = {
  ingredientId: number;
  quantity: number;
  unit: string;
  isProcessed: boolean;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  defaultUnit: string;
};

async function loadSimLines(recipeId: number): Promise<SimLine[] | null> {
  const details = await getRecipeWithDetails(recipeId);
  if (!details) return null;
  return details.lines.map((l) => ({
    ingredientId: l.ingredient.id,
    quantity: l.quantity,
    unit: l.unit,
    isProcessed: l.ingredient.isProcessed,
    calories: l.ingredient.calories,
    proteinG: l.ingredient.proteinG,
    fatG: l.ingredient.fatG,
    carbsG: l.ingredient.carbsG,
    defaultUnit: l.ingredient.defaultUnit,
  }));
}

function scoreFromSimLines(lines: SimLine[], servings: number) {
  const macros = lines.map((l) =>
    calculateLineMacros({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l,
    }),
  );
  const perServingMacros = roundMacros(perServing(roundMacros(sumMacros(macros)), servings));
  const processedCount = lines.filter((l) => l.isProcessed).length;
  return calculateHealthScore(perServingMacros, processedCount, lines.length).score;
}

function simulateSuggestion(
  lines: SimLine[],
  s: SuggestionAction,
  ingredientMap: Map<number, Ingredient>,
): SimLine[] {
  const action = s.action ?? "adjust";
  const copy = [...lines];

  if (action === "swap" && s.ingredient_id && s.new_ingredient_id) {
    const replacement = ingredientMap.get(s.new_ingredient_id);
    if (!replacement) return copy;
    return copy.map((l) =>
      l.ingredientId === s.ingredient_id
        ? {
            ingredientId: replacement.id,
            quantity: l.quantity,
            unit: l.unit,
            isProcessed: replacement.isProcessed,
            calories: replacement.calories,
            proteinG: replacement.proteinG,
            fatG: replacement.fatG,
            carbsG: replacement.carbsG,
            defaultUnit: replacement.defaultUnit,
          }
        : l,
    );
  }
  if (action === "remove" && s.ingredient_id) {
    return copy.filter((l) => l.ingredientId !== s.ingredient_id);
  }
  if (action === "add" && s.new_ingredient_id) {
    const ing = ingredientMap.get(s.new_ingredient_id);
    if (ing) {
      copy.push({
        ingredientId: ing.id,
        quantity: s.quantity ?? 100,
        unit: s.unit ?? ing.defaultUnit,
        isProcessed: ing.isProcessed,
        calories: ing.calories,
        proteinG: ing.proteinG,
        fatG: ing.fatG,
        carbsG: ing.carbsG,
        defaultUnit: ing.defaultUnit,
      });
    }
  }
  if (action === "adjust" && s.ingredient_id && s.quantity != null) {
    return copy.map((l) =>
      l.ingredientId === s.ingredient_id
        ? { ...l, quantity: s.quantity!, unit: s.unit ?? l.unit }
        : l,
    );
  }
  return copy;
}

async function projectScore(
  recipeId: number,
  servings: number,
  suggestions: SuggestionAction[],
  ingredientMap: Map<number, Ingredient>,
) {
  let lines = await loadSimLines(recipeId);
  if (!lines) return null;
  for (const s of suggestions) {
    lines = simulateSuggestion(lines, s, ingredientMap);
  }
  return scoreFromSimLines(lines, servings);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipeId = Number(id);
  const body = await request.json().catch(() => ({}));
  const apply = body.apply === true;
  const applyAll = body.applyAll === true;
  const suggestionIndex = body.suggestionIndex as number | undefined;

  const details = await getRecipeWithDetails(recipeId);
  if (!details) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  if (apply || applyAll) {
    const rawSuggestions = body.suggestions as SuggestionAction[] | undefined;
    if (!rawSuggestions?.length) {
      return NextResponse.json({ error: "No suggestions to apply" }, { status: 400 });
    }

    const toApply = applyAll
      ? rawSuggestions
      : suggestionIndex != null
        ? [rawSuggestions[suggestionIndex]]
        : [];

    for (const s of toApply) {
      await applySuggestionToRecipe(recipeId, s);
    }

    const updated = await getRecipeWithDetails(recipeId);
    return NextResponse.json({ applied: toApply.length, recipe: updated });
  }

  try {
    const settings = await getAppSettings();
    const allIngredients = await getAllIngredients();
    const ingredientMap = new Map(allIngredients.map((i) => [i.id, i]));

    const prompt = buildSuggestionPrompt({
      recipeName: details.recipe.name,
      servings: details.recipe.servings,
      ingredients: details.lines.map((l) => ({
        id: l.ingredient.id,
        name: l.ingredient.name,
        quantity: l.quantity,
        unit: l.unit,
      })),
      perServing: details.perServing,
      healthScore: details.healthScore.score,
      allIngredients: allIngredients.map((i) => ({ id: i.id, name: i.name })),
    });

    const raw = await fetchOllamaSuggestions(settings, prompt);
    const parsed = parseSuggestionsJson(raw);

    const enriched = await Promise.all(
      parsed.map(async (s) => {
        const singleScore = await projectScore(
          recipeId,
          details.recipe.servings,
          [s],
          ingredientMap,
        );
        return {
          ...s,
          computed_delta:
            singleScore != null ? singleScore - details.healthScore.score : s.score_delta,
        };
      }),
    );

    const projectedScore = await projectScore(
      recipeId,
      details.recipe.servings,
      parsed,
      ingredientMap,
    );

    return NextResponse.json({
      suggestions: enriched,
      currentScore: details.healthScore.score,
      projectedScore: projectedScore ?? details.healthScore.score,
      local: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
