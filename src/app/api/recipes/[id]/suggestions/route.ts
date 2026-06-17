import { NextResponse } from "next/server";
import {
  calculateLineMacros,
  perServing,
  roundMacros,
  sumMacros,
} from "@/lib/nutrition/calculate";
import { getAppSettings } from "@/lib/log/queries";
import { getAllIngredients, getRecipeWithDetails } from "@/lib/queries";
import type { Ingredient } from "@/lib/db/schema";
import { applySuggestionToRecipe } from "@/lib/suggestions/apply";
import { generateRuleBasedSuggestions } from "@/lib/suggestions/generate";
import { effectiveAiProvider } from "@/lib/ai/settings";
import {
  buildSuggestionPrompt,
  fetchOllamaSuggestions,
  parseSuggestionsJson,
  type SuggestionAction,
} from "@/lib/suggestions/ollama";
import { simulateAndScore } from "@/lib/suggestions/score";
import {
  formatMacroDelta,
  macroDeltaPerServing,
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

type EnrichedSuggestion = SuggestionAction & {
  computed_delta: number;
  afterScore: number;
  macro_delta: ReturnType<typeof macroDeltaPerServing>;
  macro_summary: string;
};

function enrichSuggestion(
  baseLines: SimLine[],
  suggestion: SuggestionAction,
  servings: number,
  currentScore: number,
  baseMacros: ReturnType<typeof perServingMacrosFromLines>,
  ingredientMap: Map<number, Ingredient>,
): EnrichedSuggestion | null {
  const result = simulateAndScore(
    baseLines,
    suggestion,
    servings,
    currentScore,
    ingredientMap,
  );

  if (result.delta < 1) return null;

  const afterMacros = perServingMacrosFromLines(result.afterLines, servings);
  const macroDelta = macroDeltaPerServing(baseMacros, afterMacros);

  return {
    ...suggestion,
    computed_delta: Math.round(result.delta),
    afterScore: result.afterScore,
    score_delta: Math.round(result.delta),
    macro_delta: macroDelta,
    macro_summary: `Per serving: ${formatMacroDelta(macroDelta)}`,
  };
}

function dedupeSuggestions(items: EnrichedSuggestion[]): EnrichedSuggestion[] {
  const seen = new Set<string>();
  const out: EnrichedSuggestion[] = [];
  for (const s of items) {
    const key = `${s.action}:${s.ingredient_id ?? ""}:${s.new_ingredient_id ?? ""}:${s.quantity ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
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

    const baseLines = await loadSimLines(recipeId);
    if (!baseLines) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const currentScore = details.healthScore.score;
    const baseMacros = perServingMacrosFromLines(baseLines, details.recipe.servings);
    const lineNames = new Map(details.lines.map((l) => [l.ingredient.id, l.ingredient.name]));

    let enriched: EnrichedSuggestion[] = generateRuleBasedSuggestions({
      baseLines,
      servings: details.recipe.servings,
      currentScore,
      healthScore: details.healthScore,
      ingredientMap,
      lineNames,
      allIngredients,
    }).map((s) => {
      const afterMacros = perServingMacrosFromLines(
        simulateAndScore(baseLines, s, details.recipe.servings, currentScore, ingredientMap)
          .afterLines,
        details.recipe.servings,
      );
      const macroDelta = macroDeltaPerServing(baseMacros, afterMacros);
      return {
        ...s,
        macro_delta: macroDelta,
        macro_summary: `Per serving: ${formatMacroDelta(macroDelta)}`,
      };
    });

    if (enriched.length === 0) {
      try {
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
          healthScore: currentScore,
          scoreSummary: details.healthScore.summary,
          scoreComponents: details.healthScore.components.map((c) => ({
            label: c.label,
            points: c.points,
            maxPoints: c.maxPoints,
          })),
          scorePenalties: details.healthScore.penalties.map((p) => ({
            label: p.label,
            points: p.points,
          })),
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

        const aiEnriched = parsed
          .map((s) =>
            enrichSuggestion(
              baseLines,
              s,
              details.recipe.servings,
              currentScore,
              baseMacros,
              ingredientMap,
            ),
          )
          .filter((s): s is EnrichedSuggestion => s != null);

        enriched = dedupeSuggestions([...enriched, ...aiEnriched]).sort(
          (a, b) => b.computed_delta - a.computed_delta,
        );
      } catch {
        // Rule-based suggestions are enough — AI is optional.
      }
    }

    enriched = enriched.slice(0, 4);

    const bestAfterScore =
      enriched.length > 0
        ? Math.max(...enriched.map((s) => s.afterScore))
        : currentScore;

    return NextResponse.json({
      suggestions: enriched,
      currentScore,
      projectedScore: bestAfterScore,
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate suggestions";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
