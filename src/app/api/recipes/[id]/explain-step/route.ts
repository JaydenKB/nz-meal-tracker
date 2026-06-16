import { NextResponse } from "next/server";
import { aiErrorMessage, aiErrorStatus } from "@/lib/ai/errors";
import { aiGenerateProse } from "@/lib/ai/provider";
import {
  buildExplainStepPrompt,
  type ExplainMode,
} from "@/lib/cooking/explain-step-prompt";
import type { StepIngredient } from "@/lib/cooking/match-ingredients";
import { getAppSettings } from "@/lib/log/queries";
import { getRecipeWithDetails } from "@/lib/queries";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipeId = Number(id);

  const details = await getRecipeWithDetails(recipeId);
  if (!details) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const stepIndex = Number(body.stepIndex);
  const stepText = String(body.stepText ?? "").trim();
  const mode = (body.mode === "simpler" ? "simpler" : "normal") as ExplainMode;
  const stepIngredients = Array.isArray(body.stepIngredients)
    ? (body.stepIngredients as StepIngredient[])
    : [];

  if (!Number.isFinite(stepIndex) || stepIndex < 0 || !stepText) {
    return NextResponse.json({ error: "Invalid step data" }, { status: 400 });
  }

  try {
    const settings = await getAppSettings();
    const prompt = buildExplainStepPrompt({
      recipeName: details.recipe.name,
      servings: details.recipe.servings,
      stepIndex,
      stepText,
      stepIngredients,
      mode,
    });

    const elaboration = await aiGenerateProse(settings, prompt);
    return NextResponse.json({ elaboration: elaboration.trim() });
  } catch (error) {
    return NextResponse.json(
      { error: aiErrorMessage(error) },
      { status: aiErrorStatus(error) },
    );
  }
}
