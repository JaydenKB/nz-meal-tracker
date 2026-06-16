import type { Macros } from "@/lib/nutrition/calculate";

export function MacroTiles({ perServing }: { perServing: Macros }) {
  const stats = [
    { value: Math.round(perServing.calories), label: "kcal" },
    { value: `${Math.round(perServing.proteinG)}g`, label: "protein" },
    { value: `${Math.round(perServing.fatG)}g`, label: "fat" },
    { value: `${Math.round(perServing.carbsG)}g`, label: "carbs" },
  ];

  return (
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
  );
}

/** @deprecated Use MacroTiles */
export function MacroGrid({ perServing }: { perServing: Macros }) {
  return <MacroTiles perServing={perServing} />;
}
