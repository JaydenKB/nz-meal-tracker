"use client";

const SIZE = 120;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const offset = C * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="#dceee6"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold leading-none">{Math.round(consumed)}</span>
        <span className="mt-0.5 text-[10px] text-[var(--muted)]">/ {target}</span>
      </div>
    </div>
  );
}
