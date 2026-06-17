"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SwipeAction = {
  label: string;
  onClick: () => void;
  tone?: "edit" | "delete";
};

const actionTones = {
  edit: "bg-[var(--primary)] text-white",
  delete: "bg-red-600 text-white",
};

export function SwipeRow({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const dragging = useRef(false);
  const actionWidth = actions.length * 72;
  const openThreshold = actionWidth * 0.4;

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
    dragging.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const next = Math.min(0, Math.max(-actionWidth, startOffset.current + dx));
    setOffset(next);
  }

  function onTouchEnd() {
    dragging.current = false;
    setOffset((o) => (Math.abs(o) >= openThreshold ? -actionWidth : 0));
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-card)]", className)}>
      <div className="absolute inset-y-0 right-0 flex">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick();
              setOffset(0);
            }}
            className={cn(
              "pressable flex w-[72px] items-center justify-center text-xs font-semibold",
              actionTones[action.tone ?? "edit"],
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="relative bg-[var(--surface)] transition-transform"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 0.3s var(--ease-spring)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
