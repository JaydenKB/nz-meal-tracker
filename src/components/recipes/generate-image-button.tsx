"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GenerateImageButton({ recipeId }: { recipeId: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/generate-image`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate image");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate image");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleGenerate} disabled={loading} variant="secondary">
        {loading ? "Generating…" : "Generate AI Photo"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
