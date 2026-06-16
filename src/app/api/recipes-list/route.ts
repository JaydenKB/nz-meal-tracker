import { NextResponse } from "next/server";
import { getRecentRecipes } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const recipes = await getRecentRecipes(100);
  return NextResponse.json({
    recipes: recipes.map((r) => ({ id: r.id, name: r.name, type: "recipe" as const })),
  });
}
