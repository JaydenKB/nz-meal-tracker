import { NextResponse } from "next/server";
import { getAllIngredients } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET() {
  const ingredients = await getAllIngredients();
  return NextResponse.json({
    ingredients: ingredients.map((i) => ({ id: i.id, name: i.name, type: "ingredient" as const })),
  });
}
