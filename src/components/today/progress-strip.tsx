"use client";

import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import { MiniCalorieRing } from "@/components/today/mini-calorie-ring";

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
      className="flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--streak)] px-4 py-3.5 text-white transition-opacity active:opacity-90"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Flame className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">
            {streakDays} day streak
          </p>
          <p className="mt-0.5 truncate text-xs font-normal opacity-90">
            {remaining} kcal left · tap for stats
          </p>
        </div>
      </div>
      <MiniCalorieRing consumed={consumed} target={target} />
      <ChevronRight className="h-5 w-5 shrink-0 opacity-80" strokeWidth={2} />
    </Link>
  );
}
