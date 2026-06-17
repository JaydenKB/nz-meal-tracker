import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import {
  buildGenerationPrompt,
  buildSurprisePrompt,
  generateRecipes,
} from "@/lib/generation/ollama";
import {
  goalSummary,
  RECIPE_GOALS,
  SURPRISE_FOCUSES,
  surpriseSummary,
  type RecipeGoal,
  type SurpriseFocus,
} from "@/lib/generation/goals";
import { keywordsSummarySuffix, parseRecipeKeywords } from "@/lib/generation/keywords";
import { filterVerifiedRecipes, verifyGeneratedRecipe } from "@/lib/generation/verify";
import { aiErrorJsonResponse, AI_FALLBACK_HINTS } from "@/lib/ai/handler";
import { effectiveAiProvider, providerDisplayName } from "@/lib/ai/settings";
import { getAppSettings } from "@/lib/log/queries";

export const runtime = "nodejs";

const VALID_GOALS = new Set(RECIPE_GOALS.map((g) => g.id));
const VALID_FOCUSES = new Set(SURPRISE_FOCUSES.map((f) => f.id));

export async function POST(request: Request) {
  const body = await request.json();
  const mode = body.mode === "surprise" ? "surprise" : "pick";
  const ingredientIds = (body.ingredientIds as number[] | undefined)?.filter(Boolean) ?? [];
  const goal = String(body.goal ?? "balanced") as RecipeGoal;
  const surpriseFocus = String(body.surpriseFocus ?? "healthy") as SurpriseFocus;
  const targetCaloriesPerServing =
    body.targetCaloriesPerServing != null
      ? Number(body.targetCaloriesPerServing)
      : body.maxCaloriesPerServing != null
        ? Number(body.maxCaloriesPerServing)
        : undefined;
  const keywords = parseRecipeKeywords(body.keywords);
  const count = Math.min(5, Math.max(1, Number(body.count ?? 3)));

  const allIngredients = await db.select().from(ingredients);

  if (allIngredients.length === 0) {
    return NextResponse.json({ error: "Add ingredients to your library first" }, { status: 400 });
  }

  if (mode === "pick") {
    if (ingredientIds.length === 0) {
      return NextResponse.json({ error: "Select at least one ingredient" }, { status: 400 });
    }
    if (!VALID_GOALS.has(goal)) {
      return NextResponse.json({ error: "Invalid goal preset" }, { status: 400 });
    }
  } else if (!VALID_FOCUSES.has(surpriseFocus)) {
    return NextResponse.json({ error: "Invalid surprise focus" }, { status: 400 });
  }

  const selectedIngredients =
    mode === "surprise"
      ? allIngredients
      : await db.select().from(ingredients).where(inArray(ingredients.id, ingredientIds));

  if (selectedIngredients.length === 0) {
    return NextResponse.json({ error: "No matching ingredients found" }, { status: 400 });
  }

  const verifySelectedIds =
    mode === "surprise" ? allIngredients.map((i) => i.id) : ingredientIds;
  const verifyGoal: RecipeGoal =
    mode === "surprise"
      ? surpriseFocus === "macros"
        ? "high_protein"
        : surpriseFocus === "healthy"
          ? "balanced"
          : "balanced"
      : goal;

  try {
    const settings = await getAppSettings();

    const prompt =
      mode === "surprise"
        ? buildSurprisePrompt({
            allIngredients,
            focus: surpriseFocus,
            targetCaloriesPerServing,
            keywords,
            count,
          })
        : buildGenerationPrompt({
            selectedIngredients,
            goal,
            targetCaloriesPerServing,
            keywords,
            count,
          });

    const rawRecipes = await generateRecipes(prompt, { settings });

    const verified = rawRecipes.map((raw) =>
      verifyGeneratedRecipe(
        raw,
        allIngredients,
        verifySelectedIds,
        verifyGoal,
        targetCaloriesPerServing,
        { surpriseMode: mode === "surprise" },
      ),
    );

    const recipes = filterVerifiedRecipes(verified);
    const filteredOut = verified.length - recipes.length;

    const summary =
      (mode === "surprise"
        ? surpriseSummary(surpriseFocus, targetCaloriesPerServing)
        : goalSummary(goal, targetCaloriesPerServing)) + keywordsSummarySuffix(keywords);

    return NextResponse.json({
      recipes,
      summary,
      filteredOut,
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
      providerLabel: providerDisplayName(effectiveAiProvider(settings)),
      mode,
    });
  } catch (error) {
    return aiErrorJsonResponse(error, AI_FALLBACK_HINTS.generate);
  }
}
