import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recipeIngredients, recipes } from "@/lib/db/schema";
import type { VerifiedRecipe } from "@/lib/generation/verify";
import { formatMethodForStorage } from "@/lib/recipes/format-method";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const recipe = body.recipe as VerifiedRecipe | undefined;

  if (!recipe?.name || !recipe.lines?.length) {
    return NextResponse.json({ error: "Invalid recipe data" }, { status: 400 });
  }

  const matchedLines = recipe.lines.filter((l) => l.matched && l.libraryId);

  if (matchedLines.length === 0) {
    return NextResponse.json(
      { error: "No library ingredients to save — add missing items first" },
      { status: 400 },
    );
  }

  const instructions =
    recipe.method?.length > 0 ? formatMethodForStorage(recipe.method) : null;

  const [saved] = await db
    .insert(recipes)
    .values({
      name: recipe.name,
      servings: recipe.servings,
      instructions,
      origin: "ai",
    })
    .returning({ id: recipes.id });

  for (const line of matchedLines) {
    await db.insert(recipeIngredients).values({
      recipeId: saved.id,
      ingredientId: line.libraryId!,
      quantity: line.amount,
      unit: line.unit,
    });
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${saved.id}`);

  return NextResponse.json({ id: saved.id });
}
