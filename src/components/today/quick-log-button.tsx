"use client";

import { mealTypeFromTime } from "@/lib/log/mealTime";
import { logMealWithRewards } from "@/lib/sfx/log-rewards";
import { play } from "@/lib/sfx";
import { todayString } from "@/lib/log/compute";
import { LogActionButton } from "@/components/ui/log-action-button";

export function QuickLogButton({
  recipeId,
  className,
  onLogged,
}: {
  recipeId: number;
  className?: string;
  onLogged?: () => void;
}) {
  async function handleLog(): Promise<boolean> {
    const date = todayString();
    const res = await logMealWithRewards(date, "eaten", () =>
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealType: mealTypeFromTime(),
          servings: 1,
          recipeId,
          status: "eaten",
        }),
      }),
    );

    if (!res.ok) {
      play("error");
      return false;
    }
    onLogged?.();
    return true;
  }

  return (
    <LogActionButton
      onLog={handleLog}
      className={className}
      label="Log this meal"
    />
  );
}
