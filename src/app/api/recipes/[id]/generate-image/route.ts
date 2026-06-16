import { eq } from "drizzle-orm";
import fs from "fs/promises";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import { db } from "@/lib/db";
import { ingredients, recipeIngredients, recipes } from "@/lib/db/schema";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recipeId = Number(id);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Add it to .env.local" },
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
    .limit(5);

  const topIngredients = lines.map((l) => l.ingredients.name).join(", ");
  const prompt = `Professional food photography of ${recipe.name}, featuring ${topIngredients}, appetizing, natural light, top-down angle, vibrant colors, no text, no watermark, restaurant quality plating`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = result.data?.[0]?.url;
    if (!imageUrl) {
      return NextResponse.json({ error: "No image returned from OpenAI" }, { status: 500 });
    }

    const imageRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    const dir = path.join(process.cwd(), "public", "recipe-images");
    await fs.mkdir(dir, { recursive: true });

    const filename = `recipe-${recipeId}-${Date.now()}.png`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);

    const localUrl = `/recipe-images/${filename}`;
    await db.update(recipes).set({ imageUrl: localUrl }).where(eq(recipes.id, recipeId));

    return NextResponse.json({ imageUrl: localUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
