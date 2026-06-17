import { NextResponse } from "next/server";
import { getCookFromPantryMatches } from "@/lib/pantry/cook-from-pantry";

export const runtime = "nodejs";

/** Recipes you can cook now that use any of the given ingredient IDs. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);

  if (ids.length === 0) {
    return NextResponse.json({ count: 0, recipeIds: [] });
  }

  const idSet = new Set(ids);
  const { cookNow } = await getCookFromPantryMatches("all");

  const matching = cookNow.filter((r) =>
    r.lines.some((l) => idSet.has(l.ingredientId)),
  );

  return NextResponse.json({
    count: matching.length,
    recipeIds: matching.map((r) => r.recipeId),
  });
}
