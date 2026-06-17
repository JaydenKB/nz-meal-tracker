"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  Timer,
  X,
} from "lucide-react";
import { AiLoader } from "@/components/ui/ai-loader";
import { Button } from "@/components/ui/button";
import type { ExplainMode } from "@/lib/cooking/explain-step-prompt";
import {
  formatStepIngredientLine,
  ingredientsForStep,
  type StepIngredient,
} from "@/lib/cooking/match-ingredients";
import {
  formatTimerDisplay,
  parseStepDurationSeconds,
} from "@/lib/cooking/parse-duration";
import { useWakeLock } from "@/lib/cooking/use-wake-lock";
import { mealTypeFromTime } from "@/lib/log/mealTime";
import { todayString } from "@/lib/log/compute";
import { playTimerDoneSound } from "@/lib/sfx";
import { logMealWithRewards } from "@/lib/sfx/log-rewards";

type ElaborationCache = Record<number, { normal?: string; simpler?: string }>;

type TimerState = {
  stepIndex: number;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  finished: boolean;
};

export function CookingModeClient({
  recipeId,
  recipeName,
  servings,
  steps,
  allIngredients,
}: {
  recipeId: number;
  recipeName: string;
  servings: number;
  steps: string[];
  allIngredients: StepIngredient[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"cooking" | "complete">("cooking");
  const [stepIndex, setStepIndex] = useState(0);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [elaborations, setElaborations] = useState<ElaborationCache>({});
  const [elaborationLoading, setElaborationLoading] = useState(false);
  const [elaborationError, setElaborationError] = useState<string | null>(null);
  const [showElaboration, setShowElaboration] = useState(false);
  const [elaborationMode, setElaborationMode] = useState<ExplainMode>("normal");
  const [helpfulMarked, setHelpfulMarked] = useState<Record<number, boolean>>({});
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closeConfirmMode, setCloseConfirmMode] = useState<"exit" | "finish">("exit");
  const [logging, setLogging] = useState(false);
  const timerFinishedRef = useRef(false);

  useWakeLock(phase === "cooking");

  const totalSteps = steps.length;
  const currentStep = steps[stepIndex] ?? "";
  const isLastStep = stepIndex >= totalSteps - 1;
  const stepDuration = useMemo(
    () => parseStepDurationSeconds(currentStep),
    [currentStep],
  );
  const stepIngredients = useMemo(
    () => ingredientsForStep(currentStep, allIngredients),
    [currentStep, allIngredients],
  );

  const timerForCurrentStep = timer != null && timer.stepIndex === stepIndex;
  const backgroundTimer =
    timer != null && !timer.finished && timer.stepIndex !== stepIndex;
  const displaySeconds =
    timerForCurrentStep && timer
      ? timer.remainingSeconds
      : stepDuration;

  const cachedElaboration =
    elaborationMode === "simpler"
      ? elaborations[stepIndex]?.simpler
      : elaborations[stepIndex]?.normal;

  useEffect(() => {
    if (!timer?.isRunning || timer.finished) return;
    const id = window.setInterval(() => {
      setTimer((prev) => {
        if (!prev || !prev.isRunning || prev.finished) return prev;
        const next = prev.remainingSeconds - 1;
        if (next <= 0) {
          if (!timerFinishedRef.current) {
            timerFinishedRef.current = true;
            playTimerDoneSound();
          }
          return { ...prev, remainingSeconds: 0, isRunning: false, finished: true };
        }
        return { ...prev, remainingSeconds: next };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timer?.isRunning, timer?.finished]);

  useEffect(() => {
    timerFinishedRef.current = false;
  }, [timer?.totalSeconds]);

  useEffect(() => {
    setShowElaboration(false);
    setElaborationError(null);
    setElaborationMode("normal");
  }, [stepIndex]);

  const startTimer = useCallback(() => {
    if (!stepDuration) return;
    timerFinishedRef.current = false;
    setTimer({
      stepIndex,
      totalSeconds: stepDuration,
      remainingSeconds: stepDuration,
      isRunning: true,
      finished: false,
    });
  }, [stepDuration, stepIndex]);

  const toggleTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev || prev.finished) return prev;
      return { ...prev, isRunning: !prev.isRunning };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((prev) => {
      if (!prev) return prev;
      timerFinishedRef.current = false;
      return {
        ...prev,
        remainingSeconds: prev.totalSeconds,
        isRunning: false,
        finished: false,
      };
    });
  }, []);

  async function fetchElaboration(mode: ExplainMode, force = false) {
    const cache = elaborations[stepIndex];
    const cached = mode === "simpler" ? cache?.simpler : cache?.normal;
    if (cached && !force) {
      setElaborationMode(mode);
      setShowElaboration(true);
      return;
    }

    setElaborationMode(mode);
    setShowElaboration(true);
    setElaborationLoading(true);
    setElaborationError(null);

    try {
      const res = await fetch(`/api/recipes/${recipeId}/explain-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepIndex,
          stepText: currentStep,
          mode,
          stepIngredients,
        }),
      });
      const data = (await res.json()) as { elaboration?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to explain step");

      setElaborations((prev) => ({
        ...prev,
        [stepIndex]: {
          ...prev[stepIndex],
          [mode]: data.elaboration,
        },
      }));
    } catch (e) {
      setElaborationError(e instanceof Error ? e.message : "Failed to explain step");
    } finally {
      setElaborationLoading(false);
    }
  }

  function requestClose() {
    if (timer?.isRunning) {
      setCloseConfirmMode("exit");
      setCloseConfirm(true);
      return;
    }
    router.push(`/recipes/${recipeId}`);
  }

  function confirmClose() {
    setTimer(null);
    setCloseConfirm(false);
    if (closeConfirmMode === "finish") {
      setPhase("complete");
    } else {
      router.push(`/recipes/${recipeId}`);
    }
  }

  function goNext() {
    if (isLastStep) {
      if (timer?.isRunning) {
        setCloseConfirmMode("finish");
        setCloseConfirm(true);
        return;
      }
      setTimer(null);
      setPhase("complete");
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function handleLogMeal() {
    setLogging(true);
    try {
      const date = todayString();
      await logMealWithRewards(date, "eaten", () =>
        fetch("/api/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            mealType: mealTypeFromTime(),
            servings: 1,
            recipeId,
            status: "eaten",
            deductPantry: true,
          }),
        }),
      );
      router.push("/");
      router.refresh();
    } catch {
      setLogging(false);
    }
  }

  if (phase === "complete") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white text-[var(--foreground)]">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--mint)]">
            <Check className="h-10 w-10 text-[var(--primary)]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-medium">Nice work!</h1>
          <p className="mt-2 max-w-xs text-base text-[var(--muted)]">
            You finished cooking {recipeName}. Log it to track today&apos;s meals.
          </p>
        </div>
        <div
          className="space-y-3 border-t border-[var(--border)] px-5 py-5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          <Button size="lg" className="w-full log-pop" onClick={handleLogMeal} disabled={logging}>
            {logging ? "Logging…" : "I cooked it — log meal"}
          </Button>
          <Link href={`/recipes/${recipeId}`} className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Back to recipe
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const progress = totalSteps > 0 ? (stepIndex + 1) / totalSteps : 0;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white text-[var(--foreground)]">
      {/* Top bar */}
      <header
        className="shrink-0 border-b border-[var(--border)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={requestClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
            aria-label="Close cooking mode"
          >
            <X className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-center text-sm font-medium">
            {recipeName}
          </h1>
          <button
            type="button"
            onClick={() => setOverflowOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--foreground)]"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? "bg-[var(--primary)]" : "bg-[var(--beige)]"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs font-medium text-[var(--muted)]">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-[var(--beige)]">
          <div
            className="h-full rounded-full bg-[var(--primary)]/40 transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </header>

      {/* Step content */}
      <main className="flex-1 overflow-y-auto px-5 py-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => void fetchElaboration("normal")}
            disabled={elaborationLoading}
            className="absolute -top-1 right-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--ai-soft)] px-3 py-2 text-xs font-medium text-[var(--ai)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Explain more
          </button>

          <p className="pr-28 text-[1.65rem] font-medium leading-snug text-[var(--foreground)]">
            {currentStep}
          </p>
        </div>

        {showElaboration && (
          <div className="mt-5 space-y-3">
            {elaborationLoading && <AiLoader variant="elaborate" />}
            {elaborationError && !elaborationLoading && (
              <div className="rounded-[var(--radius-lg)] bg-[var(--orange-soft)] px-4 py-4 text-sm">
                <p className="text-[#c47a2c]">{elaborationError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => void fetchElaboration(elaborationMode, true)}
                >
                  Retry
                </Button>
              </div>
            )}
            {cachedElaboration && !elaborationLoading && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--ai)]/15 bg-[var(--ai-soft)] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--ai)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  In more detail
                </p>
                <p className="text-sm leading-relaxed text-[var(--foreground)]">
                  {cachedElaboration}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchElaboration("simpler", true)}
                    className="rounded-full border border-[var(--ai)]/25 bg-white px-3 py-1.5 text-xs font-medium text-[var(--ai)]"
                  >
                    Even simpler
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setHelpfulMarked((prev) => ({ ...prev, [stepIndex]: true }))
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      helpfulMarked[stepIndex]
                        ? "border-[var(--primary)] bg-[var(--mint)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-white text-[var(--muted)]"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Helpful
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {stepDuration != null || timer != null ? (
          <div
            className={`mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--orange-soft)] p-4 ${
              timerForCurrentStep && timer?.finished ? "timer-done-pulse" : ""
            }`}
          >
            {backgroundTimer && timer && (
              <p className="mb-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-[var(--muted)]">
                Step {timer.stepIndex + 1} timer still running —{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {formatTimerDisplay(timer.remainingSeconds)}
                </span>
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Timer className="h-5 w-5 text-[var(--streak)]" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                    {displaySeconds != null
                      ? formatTimerDisplay(displaySeconds)
                      : "—"}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {timerForCurrentStep && timer?.finished
                      ? "Timer done!"
                      : timerForCurrentStep && timer?.isRunning
                        ? "Timer running"
                        : timerForCurrentStep && timer
                          ? "Timer paused"
                          : stepDuration != null
                            ? "Tap to start timer"
                            : "No timer for this step"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {timerForCurrentStep && timer && !timer.finished && (
                  <button
                    type="button"
                    onClick={resetTimer}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--muted)]"
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (!timerForCurrentStep || !timer) {
                      startTimer();
                    } else if (timer.finished && stepDuration) {
                      timerFinishedRef.current = false;
                      setTimer({
                        stepIndex,
                        totalSeconds: stepDuration,
                        remainingSeconds: stepDuration,
                        isRunning: true,
                        finished: false,
                      });
                    } else if (timerForCurrentStep) {
                      toggleTimer();
                    }
                  }}
                  disabled={stepDuration == null && !timerForCurrentStep}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--streak)] text-white shadow-sm disabled:opacity-50"
                  aria-label={timerForCurrentStep && timer?.isRunning ? "Pause timer" : "Start timer"}
                >
                  {!timerForCurrentStep || !timer || timer.finished ? (
                    <Play className="h-6 w-6" fill="currentColor" />
                  ) : timer.isRunning ? (
                    <Pause className="h-6 w-6" fill="currentColor" />
                  ) : (
                    <Play className="h-6 w-6" fill="currentColor" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          {stepIngredients.length > 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--beige)]/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                For this step
              </p>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">
                {stepIngredients.map(formatStepIngredientLine).join(" · ")}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOverflowOpen(true)}
              className="text-sm font-medium text-[var(--primary)]"
            >
              View all ingredients →
            </button>
          )}
        </div>
      </main>

      {/* Bottom controls */}
      <footer
        className="shrink-0 border-t border-[var(--border)] px-5 py-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="h-14 w-14 shrink-0 px-0"
            onClick={goBack}
            disabled={stepIndex === 0}
            aria-label="Previous step"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button size="lg" className="h-14 flex-1 text-base" onClick={goNext}>
            {isLastStep ? "Finish cooking" : "Next step"}
          </Button>
        </div>
      </footer>

      {/* Overflow sheet */}
      {overflowOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-[430px] rounded-t-[var(--radius-lg)] bg-white p-5"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Recipe overview</h3>
              <button type="button" onClick={() => setOverflowOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-5 overflow-y-auto">
              <section>
                <h4 className="mb-2 text-sm font-medium text-[var(--muted)]">All steps</h4>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-[var(--foreground)]">
                  {steps.map((step, i) => (
                    <li key={i} className={i === stepIndex ? "font-medium text-[var(--primary)]" : ""}>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-medium text-[var(--muted)]">
                  All ingredients · {servings} servings
                </h4>
                <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                  {allIngredients.map((ing, i) => (
                    <li key={i}>{formatStepIngredientLine(ing)}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Close confirm */}
      {closeConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-5">
            <h3 className="text-lg font-medium">Timer still running</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {closeConfirmMode === "finish"
                ? "Finish cooking? Your timer will stop."
                : "Exit cooking mode? Your timer will stop."}
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setCloseConfirm(false)}>
                Keep cooking
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmClose}>
                {closeConfirmMode === "finish" ? "Finish anyway" : "Exit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
