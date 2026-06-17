"use client";

import { cn } from "@/lib/utils";

export function StaggerEntrance({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("stagger-entrance", className)}>{children}</div>;
}
