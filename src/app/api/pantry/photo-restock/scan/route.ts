import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingredients } from "@/lib/db/schema";
import { aiDetectGroceries, aiVisionModelLabel } from "@/lib/ai/provider";
import { aiErrorJsonResponse, AI_FALLBACK_HINTS } from "@/lib/ai/handler";
import { effectiveAiProvider } from "@/lib/ai/settings";
import { matchGroceryList } from "@/lib/import/match-library";
import type { RestockReviewItem } from "@/lib/import/photo-restock-types";
import { getAppSettings } from "@/lib/log/queries";
import { normalizeUnit } from "@/lib/nutrition/units";

export const runtime = "nodejs";

function defaultUnit(raw?: string): string {
  if (!raw?.trim()) return "g";
  try {
    return normalizeUnit(raw, "g");
  } catch {
    return "g";
  }
}

function toReviewItem(
  matched: ReturnType<typeof matchGroceryList>[number],
  index: number,
  photoIndex: number,
): RestockReviewItem {
  const unit = defaultUnit(matched.packageUnit);
  const quantity =
    matched.packageSize != null && matched.packageSize > 0 ? matched.packageSize : null;

  return {
    id: `restock-${photoIndex}-${index}-${Date.now()}`,
    bucket: matched.bucket,
    detectedName: matched.guessName,
    brand: matched.brand,
    visionConfidence: matched.confidence,
    matchScore: matched.score,
    ingredientId: matched.ingredientId,
    ingredientName: matched.ingredientName,
    bestGuessId: matched.bestGuessId,
    bestGuessName: matched.bestGuessName,
    confirmed: matched.bucket === "matched",
    quantity,
    unit,
    sourcePhotoIndex: photoIndex,
    removed: false,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const image = typeof body.image === "string" ? body.image : undefined;
  const photoIndex = body.photoIndex != null ? Number(body.photoIndex) : 0;

  if (!image) {
    return NextResponse.json({ error: "Photo required" }, { status: 400 });
  }

  try {
    const settings = await getAppSettings();
    const detected = await aiDetectGroceries(settings, image);

    const library = await db.select().from(ingredients).orderBy(ingredients.name);
    const matched = matchGroceryList(detected, library);
    const items = matched.map((m, i) => toReviewItem(m, i, photoIndex));

    return NextResponse.json({
      items,
      itemsFoundThisPhoto: items.length,
      photoIndex,
      visionModel: aiVisionModelLabel(settings),
      local: effectiveAiProvider(settings) === "local",
      provider: effectiveAiProvider(settings),
    });
  } catch (error) {
    return aiErrorJsonResponse(error, AI_FALLBACK_HINTS.photoRestock);
  }
}
