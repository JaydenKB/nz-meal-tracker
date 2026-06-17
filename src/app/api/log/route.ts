import { NextResponse } from "next/server";
import { MEAL_TYPES, LOG_STATUSES } from "@/lib/db/schema";
import { inferLogStatus } from "@/lib/calendar/week";
import { formatDateLabel, sumDailyMacros } from "@/lib/log/compute";
import {
  createLogEntry,
  deleteLogEntry,
  getDailyGoals,
  getLogEntriesForDate,
} from "@/lib/log/queries";
import { deductRecipeFromPantry } from "@/lib/pantry/deduct";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? new Date().toLocaleDateString("en-CA");

  const [entries, goals] = await Promise.all([
    getLogEntriesForDate(date),
    getDailyGoals(),
  ]);

  const totals = sumDailyMacros(entries);

  return NextResponse.json({
    date,
    dateLabel: formatDateLabel(date),
    entries,
    totals,
    goals,
    remaining: {
      calories: Math.max(0, Math.round(goals.calorieTarget - totals.calories)),
      proteinG: Math.round((goals.proteinTargetG - totals.proteinG) * 10) / 10,
      fatG: Math.round((goals.fatTargetG - totals.fatG) * 10) / 10,
      carbsG: Math.round((goals.carbTargetG - totals.carbsG) * 10) / 10,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  const mealType = String(body.mealType ?? "");
  if (!MEAL_TYPES.includes(mealType as (typeof MEAL_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid meal type" }, { status: 400 });
  }

  const recipeId = body.recipeId ? Number(body.recipeId) : null;
  const ingredientId = body.ingredientId ? Number(body.ingredientId) : null;

  if ((!recipeId && !ingredientId) || (recipeId && ingredientId)) {
    return NextResponse.json(
      { error: "Provide either recipeId or ingredientId, not both" },
      { status: 400 },
    );
  }

  const entry = await createLogEntry({
    date: String(body.date ?? new Date().toLocaleDateString("en-CA")),
    mealType,
    servings: Math.max(0.1, Number(body.servings ?? 1)),
    recipeId,
    ingredientId,
    status:
      body.status && LOG_STATUSES.includes(body.status)
        ? body.status
        : inferLogStatus(String(body.date ?? new Date().toLocaleDateString("en-CA"))),
  });

  let pantryDeduction;
  if (body.deductPantry === true && recipeId) {
    pantryDeduction = await deductRecipeFromPantry(
      recipeId,
      Math.max(0.1, Number(body.servings ?? 1)),
      entry.id,
    );
  }

  return NextResponse.json({ entry, pantryDeduction }, { status: 201 });
}
