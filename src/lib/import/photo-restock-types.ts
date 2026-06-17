import type { MatchBucket } from "@/lib/import/match-library";
import type { VisionConfidence } from "@/lib/import/grocery-detect";

export type { DetectedGrocery, VisionConfidence } from "@/lib/import/grocery-detect";
export type { MatchBucket } from "@/lib/import/match-library";

export type RestockReviewItem = {
  id: string;
  bucket: MatchBucket;
  detectedName: string;
  brand?: string;
  visionConfidence: VisionConfidence;
  matchScore: number;
  ingredientId: number | null;
  ingredientName: string | null;
  bestGuessId: number | null;
  bestGuessName: string | null;
  confirmed: boolean;
  quantity: number | null;
  unit: string;
  conversionWarning?: string;
  sourcePhotoIndex: number;
  removed: boolean;
};

export type RestockConfirmItem = {
  ingredientId: number;
  quantity: number;
  unit: string;
  clientId?: string;
};

export type RestockConfirmWarning = {
  clientId?: string;
  ingredientId: number;
  reason: string;
};
