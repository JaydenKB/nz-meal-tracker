import { eq } from "drizzle-orm";
import fs from "fs/promises";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import path from "path";
import { AiProviderError } from "@/lib/ai/errors";
import { resolveOpenAIApiKey } from "@/lib/ai/settings";
import { db } from "@/lib/db";
import { ingredients, recipeIngredients, recipes } from "@/lib/db/schema";
import { getAppSettings } from "@/lib/log/queries";
import { createOpenAIClient, openaiGenerateRecipeImage } from "@/lib/openai/client";
import { buildRecipeImagePrompt } from "@/lib/recipes/image-prompt";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipeId = Number(id);

  if (!Number.isFinite(recipeId)) {
    return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  }

  const settings = await getAppSettings();
  const apiKey = resolveOpenAIApiKey(settings);

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key not configured. Go to Settings → paste your OpenAI key (or set OPENAI_API_KEY in .env.local).",
      },
      { status: 400 },
    );
  }

  const recipe = await db.select().from(recipes).where(eq(recipes.id, recipeId)).get();
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const lines = await db
    .select()
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .limit(8);

  const ingredientNames = lines.map((l) => l.ingredients.name);
  const prompt = buildRecipeImagePrompt(recipe.name, ingredientNames);
  const openai = createOpenAIClient(apiKey);

  try {
    const buffer = await openaiGenerateRecipeImage(openai, prompt);

    const dir = path.join(process.cwd(), "public", "recipe-images");
    await fs.mkdir(dir, { recursive: true });

    const filename = `recipe-${recipeId}-${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);

    const localUrl = `/recipe-images/${filename}`;
    await db.update(recipes).set({ imageUrl: localUrl }).where(eq(recipes.id, recipeId));

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${recipeId}`);

    return NextResponse.json({ imageUrl: localUrl });
  } catch (error) {
    const message =
      error instanceof AiProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Image generation failed";
    const status = error instanceof AiProviderError && error.code === "invalid_key" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
