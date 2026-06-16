import type { Macros } from "@/lib/nutrition/calculate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MacroCard({
  total,
  perServing,
  servings,
}: {
  total: Macros;
  perServing: Macros;
  servings: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Macros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroStat label="Calories" value={`${Math.round(perServing.calories)}`} sub={`${Math.round(total.calories)} total`} />
          <MacroStat label="Protein" value={`${perServing.proteinG}g`} sub={`${total.proteinG}g total`} />
          <MacroStat label="Fat" value={`${perServing.fatG}g`} sub={`${total.fatG}g total`} />
          <MacroStat label="Carbs" value={`${perServing.carbsG}g`} sub={`${total.carbsG}g total`} />
        </div>
        <p className="text-sm text-zinc-500">Per serving · {servings} serving{servings === 1 ? "" : "s"}</p>
      </CardContent>
    </Card>
  );
}

function MacroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-zinc-500">{sub}</p>
    </div>
  );
}
