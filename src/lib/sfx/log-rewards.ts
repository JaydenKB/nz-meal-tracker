import type { LogStatus } from "@/lib/db/schema";
import { playHighest, type SfxType } from "@/lib/sfx";
import { applyRewardFeedback, type RewardFeedback } from "@/lib/rewards/feedback";

export type LogRewardContext = {
  log: {
    entries: { status: string }[];
    totals: { calories: number; proteinG: number };
  };
  progress: {
    streakDays: number;
    milestones: { id: string; earned: boolean }[];
  };
  goals: { calorieTarget: number; proteinTargetG: number };
};

export async function captureLogRewardContext(date: string): Promise<LogRewardContext> {
  const [log, progress, goals] = await Promise.all([
    fetch(`/api/log?date=${encodeURIComponent(date)}`).then((r) => r.json()),
    fetch("/api/progress").then((r) => r.json()),
    fetch("/api/goals").then((r) => r.json()),
  ]);
  return { log, progress, goals };
}

function buildFeedback(tier: SfxType, streakDays?: number): RewardFeedback {
  const messages: Record<SfxType, string> = {
    milestone: "Milestone unlocked! 🏆",
    streak: `Logged! 🎉 · ${streakDays ?? ""}-day streak`.replace(" · -day", ""),
    goalHit: "Daily goal hit! 🎯",
    log: "Logged! ✓",
    error: "Something went wrong",
  };
  return {
    message: messages[tier],
    tier,
    confetti: tier === "milestone",
  };
}

/** After a successful log/mark-eaten, play the highest-tier reward sound. */
export async function playRewardsAfterMealLog(
  before: LogRewardContext,
  date: string,
  status: LogStatus,
): Promise<RewardFeedback> {
  if (status === "planned") {
    playHighest(["log"]);
    const feedback = buildFeedback("log");
    applyRewardFeedback(feedback);
    return feedback;
  }

  try {
    const [afterLog, afterProgress] = await Promise.all([
      fetch(`/api/log?date=${encodeURIComponent(date)}`).then((r) => r.json()),
      fetch("/api/progress").then((r) => r.json()),
    ]);

    const tiers: SfxType[] = [];

    const earnedBefore = new Set(
      before.progress.milestones.filter((m) => m.earned).map((m) => m.id),
    );
    if (
      afterProgress.milestones.some(
        (m: { id: string; earned: boolean }) => m.earned && !earnedBefore.has(m.id),
      )
    ) {
      tiers.push("milestone");
    }

    const hadEatenToday = before.log.entries.some((e) => e.status === "eaten");
    if (!hadEatenToday && afterProgress.streakDays > before.progress.streakDays) {
      tiers.push("streak");
    }

    const calBefore = before.log.totals.calories;
    const calAfter = afterLog.totals.calories;
    if (calBefore < before.goals.calorieTarget && calAfter >= before.goals.calorieTarget) {
      tiers.push("goalHit");
    }

    const proteinBefore = before.log.totals.proteinG;
    const proteinAfter = afterLog.totals.proteinG;
    if (
      proteinBefore < before.goals.proteinTargetG &&
      proteinAfter >= before.goals.proteinTargetG
    ) {
      tiers.push("goalHit");
    }

    const tier =
      tiers.length > 0
        ? (["milestone", "streak", "goalHit", "log"] as SfxType[]).find((p) =>
            tiers.includes(p),
          ) ?? "log"
        : "log";
    playHighest(tiers.length > 0 ? tiers : ["log"]);
    const feedback = buildFeedback(
      tier,
      tier === "streak" ? afterProgress.streakDays : undefined,
    );
    applyRewardFeedback(feedback);
    return feedback;
  } catch {
    playHighest(["log"]);
    const feedback = buildFeedback("log");
    applyRewardFeedback(feedback);
    return feedback;
  }
}

/** Capture context → POST log → play rewards. */
export async function logMealWithRewards(
  date: string,
  status: LogStatus,
  post: () => Promise<Response>,
) {
  const before = await captureLogRewardContext(date);
  const res = await post();
  if (!res.ok) return res;
  await playRewardsAfterMealLog(before, date, status);
  return res;
}
