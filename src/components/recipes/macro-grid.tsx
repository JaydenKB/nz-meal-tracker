"use client";

import type { Macros } from "@/lib/nutrition/calculate";
import { CountUp } from "@/components/motion/count-up";

export function MacroTiles({
  perServing,
  estimated = false,
}: {
  perServing: Macros;
  estimated?: boolean;
}) {
  const prefix = estimated ? "~" : "";
  const stats = [
    { value: perServing.calories, suffix: "", label: "kcal", round: true },
    { value: perServing.proteinG, suffix: "g", label: "protein", round: true },
    { value: perServing.fatG, suffix: "g", label: "fat", round: true },
    { value: perServing.carbsG, suffix: "g", label: "carbs", round: true },
  ];

  return (
    <div className="space-y-2">
      {estimated && (
        <p className="text-right text-xs font-medium text-[var(--streak)]">~ estimated</p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-1 py-3 text-center shadow-[var(--shadow-sm)]"
          >
            <p className="text-base font-medium leading-none text-[var(--foreground)]">
              {prefix}
              <CountUp
                value={stat.value}
                format={(n) => `${Math.round(n)}${stat.suffix}`}
              />
            </p>
            <p className="mt-1.5 text-[10px] font-normal text-[var(--muted)]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use MacroTiles */
export function MacroGrid({ perServing }: { perServing: Macros }) {
  return <MacroTiles perServing={perServing} />;
}
