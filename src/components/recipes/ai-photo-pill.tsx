"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiPhotoPill({
  recipeId,
  className,
}: {
  recipeId: number;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/generate-image`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
      {loading ? "Generating…" : "AI photo"}
    </button>
  );
}
