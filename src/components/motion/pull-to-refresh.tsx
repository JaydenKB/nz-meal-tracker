"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const THRESHOLD = 72;
const MAX_PULL = 120;

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled,
}: {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const canPull = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || refreshing) return;
      if (window.scrollY > 4) return;
      canPull.current = true;
      startY.current = e.touches[0].clientY;
    },
    [disabled, refreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!canPull.current || disabled || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        pulling.current = false;
        return;
      }
      if (window.scrollY > 4) {
        canPull.current = false;
        return;
      }
      pulling.current = true;
      setPull(Math.min(dy * 0.45, MAX_PULL));
    },
    [disabled, refreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || disabled) {
      setPull(0);
      canPull.current = false;
      return;
    }
    pulling.current = false;
    canPull.current = false;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD * 0.6);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [disabled, onRefresh, pull, refreshing]);

  const ready = pull >= THRESHOLD;

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
    >
      <div
        className="pointer-events-none flex justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pull > 0 || refreshing ? Math.max(pull, refreshing ? 44 : 0) : 0 }}
        aria-hidden
      >
        <div
          className={cn(
            "ptr-spinner mt-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--primary)]/20",
            (ready || refreshing) && "ptr-spinner-active",
          )}
          style={{
            opacity: Math.min(1, pull / THRESHOLD),
            transform: `scale(${0.6 + Math.min(pull / THRESHOLD, 1) * 0.4})`,
          }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      </div>
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.15}px)` : undefined,
          transition: pulling.current ? "none" : "transform 0.25s var(--ease-spring)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
