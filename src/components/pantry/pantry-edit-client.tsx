"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PantryEditClient({
  pantryItemId,
  ingredientId,
  name,
  quantity,
  unit,
  isStaple: initialStaple,
  lowThreshold: initialLow,
}: {
  pantryItemId: number;
  ingredientId: number;
  name: string;
  quantity: number;
  unit: string;
  isStaple: boolean;
  lowThreshold: number | null;
}) {
  const [qty, setQty] = useState(String(quantity));
  const [unitVal, setUnitVal] = useState(unit);
  const [isStaple, setIsStaple] = useState(initialStaple);
  const [lowThreshold, setLowThreshold] = useState(
    initialLow != null ? String(initialLow) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/pantry/${pantryItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId,
          quantity: Number(qty),
          unit: unitVal,
          isStaple,
          lowThreshold: lowThreshold ? Number(lowThreshold) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      window.location.href = "/shop/pantry";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[430px] space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <Link
          href="/shop/pantry"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-medium">{name}</h1>
          <p className="text-sm text-[var(--muted)]">Adjust pantry stock</p>
        </div>
      </div>

      <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
        <div className="flex gap-2">
          <Input value={qty} onChange={(e) => setQty(e.target.value)} className="flex-1" />
          <Input value={unitVal} onChange={(e) => setUnitVal(e.target.value)} className="w-24" />
        </div>
        <Input
          placeholder="Low threshold"
          value={lowThreshold}
          onChange={(e) => setLowThreshold(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isStaple}
            onChange={(e) => setIsStaple(e.target.checked)}
            className="accent-[var(--primary)]"
          />
          Staple item
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
