"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { mealTypeFromTime } from "@/lib/log/mealTime";
import { playLogSound } from "@/lib/sfx";
import { todayString } from "@/lib/log/compute";
import { cn } from "@/lib/utils";

export function QuickLogButton({
  recipeId,
  className,
  onLogged,
}: {
  recipeId: number;
  className?: string;
  onLogged?: () => void;
}) {
  const [popping, setPopping] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: todayString(),
        mealType: mealTypeFromTime(),
        servings: 1,
        recipeId,
      }),
    });

    playLogSound();
    setPopping(true);
    setTimeout(() => setPopping(false), 350);
    setBusy(false);
    onLogged?.();
  }

  return (
    <button
      type="button"
      onClick={handleLog}
      disabled={busy}
      aria-label="Log this meal"
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white transition-transform disabled:opacity-60",
        popping && "log-pop",
        className,
      )}
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );
}
