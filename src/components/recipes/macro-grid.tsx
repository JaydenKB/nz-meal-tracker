import type { Macros } from "@/lib/nutrition/calculate";

export function MacroTiles({
  perServing,
  estimated = false,
}: {
  perServing: Macros;
  estimated?: boolean;
}) {
  const prefix = estimated ? "~" : "";
  const stats = [
    { value: `${prefix}${Math.round(perServing.calories)}`, label: "kcal" },
    { value: `${prefix}${Math.round(perServing.proteinG)}g`, label: "protein" },
    { value: `${prefix}${Math.round(perServing.fatG)}g`, label: "fat" },
    { value: `${prefix}${Math.round(perServing.carbsG)}g`, label: "carbs" },
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
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-1 py-3 text-center"
        >
          <p className="text-base font-medium leading-none text-[var(--foreground)]">
            {stat.value}
          </p>
          <p className="mt-1.5 text-[10px] font-normal text-[var(--muted)]">{stat.label}</p>
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
