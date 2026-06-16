import type { MealType } from "@/lib/db/schema";

/** Infer meal type from local time of day. */
export function mealTypeFromTime(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
