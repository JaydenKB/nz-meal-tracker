"use client";

import { cn } from "@/lib/utils";

export function StockBar({
  pct,
  level,
  className,
}: {
  pct: number;
  level: "low" | "ok";
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--beige)]", className)}>
      <div
        className={cn(
          "stock-bar-fill h-full rounded-full",
          level === "low" ? "bg-[var(--streak)]" : "bg-[var(--success)]",
        )}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}
