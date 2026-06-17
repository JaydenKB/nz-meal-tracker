import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";

export type BarcodeDraft = {
  barcode: string;
  name: string;
  brand?: string;
  packageSize: number | null;
  packageUnit: string;
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  nutrients?: ExtendedNutrients;
  imageUrl?: string;
  isProcessed: boolean;
  nutritionSource: "openfoodfacts";
  missingFields: string[];
};

export type BarcodeLookupResponse =
  | {
      status: "local";
      barcode: string;
      ingredient: {
        id: number;
        name: string;
        calories: number;
        proteinG: number;
        fatG: number;
        carbsG: number;
        canonicalUnit: string | null;
      };
    }
  | {
      status: "found" | "partial";
      barcode: string;
      draft: BarcodeDraft;
    }
  | {
      status: "not_found";
      barcode: string;
    }
  | {
      status: "offline";
      barcode: string;
      message: string;
    };

export type BarcodeSaveBody = {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  packageSize: number;
  packageUnit?: string;
  isProcessed?: boolean;
  nutrientsJson?: string;
  /** Number of packages to add */
  packageCount?: number;
  addToPantry?: boolean;
};
