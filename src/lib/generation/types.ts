export type RawGeneratedRecipe = {
  name: string;
  servings: number;
  ingredients: {
    name: string;
    amount: number;
    unit: string;
    library_id?: number;
  }[];
  method: string[];
};

export type RecipeBatchPayload = {
  recipes: RawGeneratedRecipe[];
};
