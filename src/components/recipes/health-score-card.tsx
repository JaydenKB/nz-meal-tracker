import type { HealthScoreResult } from "@/lib/nutrition/healthScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HealthScoreCard({ result }: { result: HealthScoreResult }) {
  const color =
    result.score >= 75 ? "text-emerald-600" : result.score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <span className={`text-5xl font-bold ${color}`}>{result.score}</span>
          <span className="pb-2 text-zinc-500">/ 100</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {result.reasons.map((reason) => (
            <Badge key={reason}>{reason}</Badge>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <ScoreBar label="Protein" value={result.breakdown.proteinDensity} max={25} />
          <ScoreBar label="Balance" value={result.breakdown.macroBalance} max={25} />
          <ScoreBar label="Calories" value={result.breakdown.calorieSanity} max={25} />
          <ScoreBar label="Whole foods" value={result.breakdown.wholeFood} max={25} />
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
