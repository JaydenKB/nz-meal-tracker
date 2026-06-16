"use client";

import { useShowBottomNav } from "@/components/layout/bottom-nav";
import { cn } from "@/lib/utils";

export function MainShell({ children }: { children: React.ReactNode }) {
  const showNav = useShowBottomNav();

  return (
    <main
      className={cn(
        "relative z-10 min-h-screen px-5",
        showNav ? "app-main" : "app-main-no-nav",
      )}
    >
      {children}
    </main>
  );
}
