/** Canonical JSON schema for recipe generation — shared across all AI providers. */
export const RECIPE_INGREDIENT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Ingredient name" },
    amount: { type: "number", description: "Quantity for the whole recipe (all servings)" },
    unit: {
      type: "string",
      description: "One of: g, kg, ml, l, tsp, tbsp, cup, each",
    },
    library_id: {
      type: ["integer", "null"],
      description: "ID from the user ingredient library, or null for pantry extras",
    },
  },
  required: ["name", "amount", "unit", "library_id"],
  additionalProperties: false,
} as const;

export const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    servings: { type: "integer", minimum: 1, maximum: 8 },
    ingredients: {
      type: "array",
      minItems: 1,
      items: RECIPE_INGREDIENT_SCHEMA,
    },
    method: {
      type: "array",
      items: {
        type: "string",
        description:
          "One detailed cooking step — include timing, heat, and sensory cues; do not prefix with numbers",
      },
      minItems: 4,
    },
  },
  required: ["name", "servings", "ingredients", "method"],
  additionalProperties: false,
} as const;

export const RECIPE_BATCH_JSON_SCHEMA = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      minItems: 1,
      items: RECIPE_SCHEMA,
    },
  },
  required: ["recipes"],
  additionalProperties: false,
} as const;
