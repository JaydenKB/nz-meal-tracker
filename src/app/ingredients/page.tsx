import { createIngredient, deleteIngredient } from "@/app/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";
import { getAllIngredients } from "@/lib/queries";

export default async function IngredientsPage() {
  const allIngredients = await getAllIngredients();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ingredients"
        subtitle="Nutrition per 100g or per unit"
      />

      <Card>
        <CardHeader>
          <CardTitle>Add ingredient</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createIngredient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Chicken breast" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="defaultUnit">Unit</Label>
                <Select id="defaultUnit" name="defaultUnit" defaultValue="g">
                  {SUPPORTED_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input id="calories" name="calories" type="number" step="0.1" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proteinG">Protein (g)</Label>
                <Input id="proteinG" name="proteinG" type="number" step="0.1" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatG">Fat (g)</Label>
                <Input id="fatG" name="fatG" type="number" step="0.1" defaultValue={0} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="carbsG">Carbs (g)</Label>
                <Input id="carbsG" name="carbsG" type="number" step="0.1" defaultValue={0} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input id="isProcessed" name="isProcessed" type="checkbox" className="h-4 w-4 rounded" />
              Processed food
            </label>
            <Button type="submit" className="w-full">Add ingredient</Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-2.5">
        <h2 className="text-base font-semibold">Library ({allIngredients.length})</h2>
        {allIngredients.map((ing) => (
          <div
            key={ing.id}
            className="flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] px-4 py-3.5"
          >
            <div>
              <p className="font-semibold">{ing.name}</p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {ing.calories} kcal · P {ing.proteinG}g · F {ing.fatG}g · C {ing.carbsG}g
              </p>
            </div>
            <form action={deleteIngredient.bind(null, ing.id)}>
              <Button type="submit" variant="ghost" size="sm">Delete</Button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
