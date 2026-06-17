import type { HealthScoreResult } from "@/lib/nutrition/healthScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HealthScoreCard({ result }: { result: HealthScoreResult }) {
  const color =
    result.final >= 75 ? "text-emerald-600" : result.final >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className={`text-5xl font-bold ${color}`}>{result.final}</span>
          <span className="pb-2 text-zinc-500">/ 100</span>
        </div>
        <p className="text-sm text-zinc-600">{result.summary}</p>
        <div className="flex flex-wrap gap-2">
          {result.reasons.map((reason) => (
            <Badge key={reason}>{reason}</Badge>
          ))}
        </div>
        <div className="space-y-2 text-sm">
          {result.components.map((c) => (
            <ScoreBar key={c.key} label={c.label} value={c.points} max={c.maxPoints} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-zinc-500">{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
