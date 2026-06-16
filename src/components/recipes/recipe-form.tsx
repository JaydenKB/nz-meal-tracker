"use client";

import { createRecipe } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";
import { useState } from "react";

type IngredientOption = {
  id: number;
  name: string;
  defaultUnit: string;
};

export function RecipeForm({ ingredients }: { ingredients: IngredientOption[] }) {
  const [rows, setRows] = useState([0, 1, 2]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recipe details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createRecipe} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe name</Label>
            <Input id="name" name="name" required placeholder="Chicken & quinoa bowl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servings">Servings</Label>
            <Input id="servings" name="servings" type="number" min={1} defaultValue={4} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea id="instructions" name="instructions" placeholder="Cook quinoa, sear chicken..." />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ingredients</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setRows((r) => [...r, r.length])}
              >
                Add row
              </Button>
            </div>

            {rows.map((row) => (
              <div
                key={row}
                className="space-y-3 rounded-[var(--radius-lg)] bg-[var(--beige)] p-3.5"
              >
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select name="ingredientId" defaultValue="">
                    <option value="" disabled>Select</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input name="quantity" type="number" step="0.1" min={0} placeholder="200" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select name="unit" defaultValue="g">
                      {SUPPORTED_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" size="lg" className="w-full">
            Create recipe
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
