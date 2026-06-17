"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

const SESSION_KEY = "nzmt-splash-seen";
const FULL_DURATION_MS = 1300;
const STATIC_DURATION_MS = 750;

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function LaunchSplash() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    setExiting(true);
    window.setTimeout(() => setVisible(false), reduced ? 200 : 350);
  }, [reduced]);

  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (seen) return;

    setVisible(true);
    const duration = reduced ? STATIC_DURATION_MS : FULL_DURATION_MS;
    const timer = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, reduced]);

  if (!visible) return null;

  return (
    <div
      role="presentation"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") dismiss();
      }}
      className={cn(
        "fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[var(--splash-gradient)]",
        !exiting && !reduced && "splash-auto",
        exiting && "splash-skip",
        reduced && "splash-static",
      )}
      aria-label="Loading NZ Meal Tracker. Tap to skip."
    >
      <div className="flex flex-col items-center gap-5 px-8">
        <div className="splash-mark relative">
          <div className="overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]">
            <Image
              src="/icon-192.png"
              alt=""
              width={72}
              height={72}
              priority
              className="block"
            />
          </div>
          <div className="absolute -bottom-3 -right-3">
            <CalorieRing
              size={44}
              stroke={4}
              variant="on-light"
              animateSweep={!reduced}
              showLabels={false}
            />
          </div>
        </div>

        <div className="mt-2 text-center">
          <h1 className="splash-title text-xl font-semibold tracking-tight text-[var(--foreground)]">
            NZ Meal Tracker
          </h1>
          <p className="splash-tagline mt-1.5 text-sm text-[var(--muted)]">
            plan · cook · shop
          </p>
        </div>
      </div>
    </div>
  );
}

/** Call on first meaningful interaction if splash was skipped early */
export function markSplashSeen() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, "1");
  }
}

export { isStandalonePwa };
