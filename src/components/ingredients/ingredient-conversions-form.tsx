"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { updateIngredientConversions } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import {
  densityGPerMlFromIngredient,
  ingredientConversionComplete,
  previewKitchenConversions,
} from "@/lib/nutrition/units";

type Canonical = "g" | "ml" | "each";

export function IngredientConversionsForm({
  ingredient,
}: {
  ingredient: {
    id: number;
    name: string;
    defaultUnit: string;
    canonicalUnit: string | null;
    mlPerGram: number | null;
    gramsPerUnit: number | null;
  };
}) {
  const initialCanonical: Canonical =
    ingredient.canonicalUnit === "ml" || ingredient.canonicalUnit === "each"
      ? ingredient.canonicalUnit
      : "g";

  const [canonical, setCanonical] = useState<Canonical>(initialCanonical);
  const [density, setDensity] = useState(
    () => String(densityGPerMlFromIngredient(ingredient) ?? ""),
  );
  const [gramsEach, setGramsEach] = useState(() => String(ingredient.gramsPerUnit ?? ""));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    const densityNum = density ? Number(density) : null;
    return previewKitchenConversions({
      defaultUnit: ingredient.defaultUnit,
      canonicalUnit: canonical,
      mlPerGram: densityNum && densityNum > 0 ? 1 / densityNum : null,
      gramsPerUnit: gramsEach ? Number(gramsEach) : null,
      name: ingredient.name,
    });
  }, [canonical, density, gramsEach, ingredient.defaultUnit, ingredient.name]);

  const complete = ingredientConversionComplete({
    defaultUnit: ingredient.defaultUnit,
    canonicalUnit: canonical,
    mlPerGram: density ? 1 / Number(density) : null,
    gramsPerUnit: gramsEach ? Number(gramsEach) : null,
  });

  async function save() {
    setSaving(true);
    const fd = new FormData();
    fd.set("id", String(ingredient.id));
    fd.set("canonicalUnit", canonical);
    fd.set("densityGPerMl", density);
    fd.set("gramsPerEach", gramsEach);
    await updateIngredientConversions(fd);
    setSaving(false);
  }

  return (
    <section id="conversions" className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-4 py-4">
      <div>
        <h2 className="text-base font-medium text-[var(--foreground)]">Conversions & units</h2>
        <p className="text-sm text-[var(--muted)]">Density and count weights for accurate macros</p>
      </div>

      <div
        className={`flex items-center gap-2 rounded-[var(--radius-card)] px-3 py-2.5 text-sm ${
          complete
            ? "bg-[var(--green-soft)] text-[var(--primary)]"
            : "bg-[var(--orange-soft)] text-[#c47a2c]"
        }`}
      >
        {complete && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
        <span className="font-medium">
          {complete ? "Conversions set — macros are exact" : "Missing — some recipes estimated"}
        </span>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
          Canonical unit
        </p>
        <div className="flex gap-2">
          {(["g", "ml", "each"] as const).map((u) => (
            <Pill key={u} active={canonical === u} onClick={() => setCanonical(u)} className="flex-1">
              {u === "g" ? "grams" : u === "ml" ? "millilitres" : "each"}
            </Pill>
          ))}
        </div>
      </div>

      {(canonical === "g" || canonical === "ml") && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Density (weight per volume)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              placeholder="e.g. 0.91"
              className="flex-1"
            />
            <span className="shrink-0 text-sm text-[var(--muted)]">g / ml</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Used to convert tsp / tbsp / cup → grams accurately.
          </p>
        </div>
      )}

      {(canonical === "g" || canonical === "each") && (
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Grams per item
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={gramsEach}
              onChange={(e) => setGramsEach(e.target.value)}
              placeholder="e.g. 50"
              className="flex-1"
            />
            <span className="shrink-0 text-sm text-[var(--muted)]">g / each</span>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-card)] bg-[var(--beige)] px-3 py-3 text-sm">
        <p className="mb-2 font-medium text-[var(--foreground)]">Common amounts</p>
        <div className="space-y-1.5 text-[var(--muted)]">
          <PreviewRow label="1 tsp" ml={preview.tsp.ml} grams={preview.tsp.grams} exact={preview.tsp.exact} />
          <PreviewRow label="1 tbsp" ml={preview.tbsp.ml} grams={preview.tbsp.grams} exact={preview.tbsp.exact} />
          <PreviewRow label="1 cup" ml={preview.cup.ml} grams={preview.cup.grams} exact={preview.cup.exact} />
          <PreviewRow label="1 each" grams={preview.each.grams} exact={preview.each.exact} />
        </div>
      </div>

      <Button className="w-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save conversions"}
      </Button>
    </section>
  );
}

function PreviewRow({
  label,
  ml,
  grams,
  exact,
}: {
  label: string;
  ml?: number;
  grams: number | null;
  exact: boolean;
}) {
  const parts: string[] = [];
  if (ml != null) parts.push(`${ml} ml`);
  if (grams != null) parts.push(`${Math.round(grams * 10) / 10} g`);
  if (parts.length === 0) parts.push("—");

  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className={exact ? "text-[var(--foreground)]" : "text-[#c47a2c]"}>
        {parts.join(" · ")}
        {!exact && grams != null && " ~"}
      </span>
    </div>
  );
}
