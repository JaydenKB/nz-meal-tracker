import { NextResponse } from "next/server";
import {
  calculateLineMacros,
  calculateLineNutrients,
  perServing,
  perServingNutrients,
  roundMacros,
  sumMacros,
  sumNutrients,
} from "@/lib/nutrition/calculate";
import { calculateHealthScore } from "@/lib/nutrition/healthScore";
import { getAppSettings } from "@/lib/log/queries";
import { getAllIngredients, getRecipeWithDetails } from "@/lib/queries";
import type { Ingredient } from "@/lib/db/schema";
import { applySuggestionToRecipe } from "@/lib/suggestions/apply";
import { effectiveAiProvider } from "@/lib/ai/settings";
import {
  buildSuggestionPrompt,
  fetchOllamaSuggestions,
  parseSuggestionsJson,
  type SuggestionAction,
} from "@/lib/suggestions/ollama";
import {
  formatMacroDelta,
  macroDeltaPerServing,
  simulateSuggestion,
  type SimLine,
} from "@/lib/suggestions/simulate";

export const runtime = "nodejs";

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
    nutrientsJson: l.ingredient.nutrientsJson,
  }));
}

function perServingMacrosFromLines(lines: SimLine[], servings: number) {
  const macros = lines.map((l) =>
    calculateLineMacros({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l,
    }),
  );
  return roundMacros(perServing(roundMacros(sumMacros(macros)), servings));
}

function scoreFromSimLines(lines: SimLine[], servings: number) {
  const macros = lines.map((l) =>
    calculateLineMacros({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l,
    }),
  );
  const nutrients = lines.map((l) =>
    calculateLineNutrients({
      quantity: l.quantity,
      unit: l.unit,
      ingredient: l,
    }),
  );
  const perServingMacros = roundMacros(perServing(roundMacros(sumMacros(macros)), servings));
  const perServingExtended = perServingNutrients(sumNutrients(nutrients), servings);
  const processedCount = lines.filter((l) => l.isProcessed).length;
  return calculateHealthScore(
    perServingMacros,
    processedCount,
    lines.length,
    perServingExtended,
  ).score;
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
      perServingNutrients: details.perServingNutrients,
      healthScore: details.healthScore.score,
      allIngredients: allIngredients.map((i) => ({
        id: i.id,
        name: i.name,
        calories: i.calories,
        proteinG: i.proteinG,
        fatG: i.fatG,
        carbsG: i.carbsG,
        defaultUnit: i.defaultUnit,
      })),
    });

    const raw = await fetchOllamaSuggestions(settings, prompt);
    const parsed = parseSuggestionsJson(raw);

    const baseLines = await loadSimLines(recipeId);
    if (!baseLines) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const baseMacros = perServingMacrosFromLines(baseLines, details.recipe.servings);

    const enriched = parsed.map((s) => {
      const afterLines = simulateSuggestion(baseLines, s, ingredientMap);
      const afterMacros = perServingMacrosFromLines(afterLines, details.recipe.servings);
      const macroDelta = macroDeltaPerServing(baseMacros, afterMacros);
      const singleScore = scoreFromSimLines(afterLines, details.recipe.servings);
      const computedDelta =
        singleScore != null ? singleScore - details.healthScore.score : s.score_delta;

      return {
        ...s,
        computed_delta: computedDelta,
        macro_delta: macroDelta,
        macro_summary: `Per serving: ${formatMacroDelta(macroDelta)}`,
      };
    });

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
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
