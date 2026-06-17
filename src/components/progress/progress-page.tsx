"use client";

import Link from "next/link";
import { ArrowLeft, Flame, Lock, Trophy } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CountUp } from "@/components/motion/count-up";
import type { ProgressStats } from "@/lib/progress/stats";

const DAY_LABELS = ["W", "T", "F", "S", "S", "M", "T"];

export function ProgressPageClient({ stats }: { stats: ProgressStats }) {
  const maxTrend = Math.max(...stats.scoreTrend, 1);
  const earnedCount = stats.milestones.filter((m) => m.earned).length;

  return (
    <div className="mx-auto max-w-[430px] space-y-6 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          className="pressable flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </Link>
        <h1 className="text-[var(--text-display)] font-semibold text-[var(--foreground)]">
          Your progress
        </h1>
      </header>

      <div className="rounded-[var(--radius-card)] px-6 py-8 text-center text-white shadow-[var(--shadow-md)] [background-image:var(--streak-gradient)]">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
          <Flame className="h-7 w-7" strokeWidth={2} />
        </div>
        <p className="text-4xl font-semibold leading-none">
          <CountUp value={stats.streakDays} /> days
        </p>
        <p className="mt-2 text-sm font-normal opacity-90">
          streak · best{" "}
          <CountUp value={stats.bestStreakDays} />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          tone="green"
          label="Avg score"
          value={<CountUp value={stats.avgHealthScore} />}
          sub={
            stats.scoreDelta !== 0 && (
              <span className="text-[var(--success)]">
                {stats.scoreDelta > 0 ? "+" : ""}
                {stats.scoreDelta}
              </span>
            )
          }
        />
        <StatCard
          tone="blue"
          label="Protein hit"
          value={`${stats.proteinHitDays} / ${stats.proteinHitTotal}`}
        />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
          Score · last 7 days
        </h2>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--beige)] px-4 py-5 shadow-[var(--shadow-sm)]">
          <div className="flex h-24 items-end justify-between gap-1">
            {stats.scoreTrend.map((score, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="progress-bar-fill w-full max-w-[28px] rounded-t-md bg-[var(--success)]"
                  style={{ height: `${Math.max(8, (score / maxTrend) * 72)}px` }}
                />
                <span className="text-[10px] text-[var(--muted)]">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Milestones</h2>
        {earnedCount === 0 ? (
          <EmptyState
            icon={Trophy}
            iconTone="amber"
            title="Milestones await"
            body="Log meals consistently — unlock streak badges, protein goals, and score achievements along the way."
            actions={[{ label: "Back to Today", href: "/" }]}
            tip="Your first milestone unlocks at a 10-day streak."
          />
        ) : (
        <div className="flex justify-between gap-2">
          {stats.milestones.map((m) => (
            <div key={m.id} className="flex flex-1 flex-col items-center gap-2 text-center">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  m.earned
                    ? m.id === "protein"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--ai-soft)] text-[var(--ai)]"
                    : "bg-[var(--beige)] text-[var(--muted)]"
                }`}
              >
                {m.earned ? (
                  <Trophy className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                )}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  m.earned ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                {m.label}
              </span>
            </div>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}
