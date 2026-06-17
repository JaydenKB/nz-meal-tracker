"use client";

import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { MiniCalorieRing } from "@/components/today/mini-calorie-ring";
import { CountUp } from "@/components/motion/count-up";

type ProgressStripProps = {
  streakDays: number;
  consumed: number;
  target: number;
  remaining: number;
};

export function ProgressStrip({
  streakDays,
  consumed,
  target,
  remaining,
}: ProgressStripProps) {
  return (
    <Link
      href="/progress"
      className="pressable flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3.5 text-white shadow-[var(--shadow-md)] [background-image:var(--streak-gradient)]"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Flame className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            🔥{" "}
            <CountUp value={streakDays} format={(n) => `${Math.round(n)}`} /> day
            {streakDays === 1 ? "" : "s"} streak
          </p>
          <p className="mt-0.5 truncate text-xs font-normal opacity-90">
            <CountUp value={remaining} format={(n) => `${Math.round(n)}`} /> kcal left
            · tap for stats
          </p>
        </div>
      </div>
      <MiniCalorieRing consumed={consumed} target={target} />
      <ChevronRight className="h-5 w-5 shrink-0 opacity-80" strokeWidth={2} />
    </Link>
  );
}
