"use client";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const DEFAULT_SIZE = 52;
const DEFAULT_STROKE = 5;

type CalorieRingProps = {
  consumed?: number;
  target?: number;
  fillPct?: number;
  size?: number;
  stroke?: number;
  variant?: "on-dark" | "on-light";
  animateSweep?: boolean;
  showLabels?: boolean;
  className?: string;
  id?: string;
};

export function CalorieRing({
  consumed = 0,
  target = 2000,
  fillPct,
  size = DEFAULT_SIZE,
  stroke = DEFAULT_STROKE,
  variant = "on-dark",
  animateSweep = false,
  showLabels = true,
  className,
  id,
}: CalorieRingProps) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct =
    fillPct != null
      ? Math.min(Math.max(fillPct, 0), 1)
      : target > 0
        ? Math.min(consumed / target, 1)
        : 0;
  const offset = c * (1 - pct);
  const sweepTarget = c * 0.25;

  const trackStroke =
    variant === "on-dark" ? "rgba(255,255,255,0.35)" : "rgba(15,110,86,0.15)";
  const progressStroke = variant === "on-dark" ? "white" : "var(--primary)";
  const labelClass =
    variant === "on-dark" ? "text-white" : "text-[var(--foreground)]";
  const subClass =
    variant === "on-dark" ? "text-white/80" : "text-[var(--muted)]";

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackStroke}
          strokeWidth={stroke}
        />
        <circle
          id={id}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressStroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={animateSweep ? c : offset}
          className={cn(
            animateSweep ? "splash-ring-progress" : !reduced && "ring-fill-transition",
          )}
          style={
            animateSweep
              ? ({
                  "--ring-circumference": c,
                  "--ring-offset-target": sweepTarget,
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      {showLabels && (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center text-center",
            labelClass,
          )}
        >
          <span className="text-[10px] font-medium leading-none">
            {Math.round(consumed)}
          </span>
          <span className={cn("text-[8px]", subClass)}>/ {target}</span>
        </div>
      )}
    </div>
  );
}
