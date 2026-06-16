"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createIngredient } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/lib/nutrition/units";
import type { ExtendedNutrients } from "@/lib/nutrition/nutrients";
import { nutrientsSummary } from "@/lib/nutrition/nutrients";

export function AddIngredientForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [fatG, setFatG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [isProcessed, setIsProcessed] = useState(false);
  const [nutrientsJson, setNutrientsJson] = useState("");
  const [nutritionSource, setNutritionSource] = useState("");
  const [nutrientPreview, setNutrientPreview] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function handleLookup() {
    if (!name.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      const res = await fetch(
        `/api/ingredients/lookup?q=${encodeURIComponent(name.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");

      setCalories(String(data.calories ?? ""));
      setProteinG(String(data.proteinG ?? ""));
      setFatG(String(data.fatG ?? ""));
      setCarbsG(String(data.carbsG ?? ""));
      setNutrientsJson(data.nutrientsJson ?? "");
      setNutritionSource(data.source ?? "");
      setNutrientPreview(
        data.nutrients ? nutrientsSummary(data.nutrients as ExtendedNutrients) : "",
      );
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("defaultUnit", defaultUnit);
    formData.set("calories", calories || "0");
    formData.set("proteinG", proteinG || "0");
    formData.set("fatG", fatG || "0");
    formData.set("carbsG", carbsG || "0");
    if (isProcessed) formData.set("isProcessed", "on");
    if (nutrientsJson) formData.set("nutrientsJson", nutrientsJson);
    if (nutritionSource) formData.set("nutritionSource", nutritionSource);
    try {
      await createIngredient(formData);
      setName("");
      setCalories("");
      setProteinG("");
      setFatG("");
      setCarbsG("");
      setNutrientsJson("");
      setNutritionSource("");
      setNutrientPreview("");
      setIsProcessed(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <div className="flex gap-2">
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Chicken breast"
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={lookupLoading || !name.trim()}
            onClick={handleLookup}
            className="shrink-0 px-3"
          >
            <Sparkles className="h-4 w-4" />
            {lookupLoading ? "…" : "Fill"}
          </Button>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Auto-fill from USDA / Open Food Facts / common foods reference
        </p>
      </div>

      {lookupError && (
        <p className="text-sm text-[#c47a2c]">{lookupError}</p>
      )}

      {nutritionSource && (
        <p className="text-xs text-[var(--primary)]">
          Source:{" "}
          {nutritionSource === "reference"
            ? "reference (common foods)"
            : nutritionSource}
          {nutrientPreview ? ` · ${nutrientPreview}` : ""}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="defaultUnit">Unit</Label>
          <Select
            id="defaultUnit"
            value={defaultUnit}
            onChange={(e) => setDefaultUnit(e.target.value)}
          >
            {SUPPORTED_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="calories">Calories</Label>
          <Input
            id="calories"
            type="number"
            step="0.1"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proteinG">Protein (g)</Label>
          <Input
            id="proteinG"
            type="number"
            step="0.1"
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fatG">Fat (g)</Label>
          <Input
            id="fatG"
            type="number"
            step="0.1"
            value={fatG}
            onChange={(e) => setFatG(e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-2">
          <Label htmlFor="carbsG">Carbs (g)</Label>
          <Input
            id="carbsG"
            type="number"
            step="0.1"
            value={carbsG}
            onChange={(e) => setCarbsG(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isProcessed}
          onChange={(e) => setIsProcessed(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Processed food
      </label>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Adding…" : "Add ingredient"}
      </Button>
    </form>
  );
}
