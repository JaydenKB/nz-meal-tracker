import type { Macros } from "@/lib/nutrition/calculate";

export function MacroGrid({ perServing }: { perServing: Macros }) {
  const stats = [
    { value: Math.round(perServing.calories), label: "kcal" },
    { value: `${Math.round(perServing.proteinG)}g`, label: "protein" },
    { value: `${Math.round(perServing.fatG)}g`, label: "fat" },
    { value: `${Math.round(perServing.carbsG)}g`, label: "carbs" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[var(--radius)] bg-[var(--beige)] px-2 py-3 text-center"
        >
          <p className="text-lg font-bold leading-none">{stat.value}</p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
