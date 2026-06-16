"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiPhotoPill({
  recipeId,
  hasImage = false,
  className,
}: {
  recipeId: number;
  hasImage?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/generate-image`, { method: "POST" });
      const data = (await res.json()) as { error?: string; imageUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate photo");
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate photo");
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm disabled:opacity-70"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
        {loading ? "Generating…" : hasImage ? "New photo" : "AI photo"}
      </button>
      {error && (
        <p className="max-w-[14rem] rounded-lg bg-black/75 px-2.5 py-1.5 text-right text-[11px] leading-snug text-white">
          {error}
        </p>
      )}
    </div>
  );
}
