"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
];

const TAB_ROOTS = new Set(["/", "/recipes", "/shop"]);

export function useShowBottomNav() {
  const pathname = usePathname();
  return TAB_ROOTS.has(pathname);
}

export function BottomNav() {
  const pathname = usePathname();

  if (!TAB_ROOTS.has(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-sm)]">
      <div className="mx-auto flex max-w-[430px] items-stretch justify-around px-2 pt-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "pressable relative flex flex-1 flex-col items-center gap-0.5 rounded-[var(--radius)] py-2 transition-colors duration-200",
                active ? "text-[var(--primary)]" : "text-[var(--muted)]",
              )}
            >
              <span
                className={cn(
                  "nav-indicator absolute top-0 h-1 w-5 rounded-full bg-[var(--primary)]",
                  active ? "scale-100 opacity-100" : "scale-75 opacity-0",
                )}
              />
              <Icon
                className={cn("h-5 w-5 transition-transform duration-200", active && "nav-icon-active -translate-y-0.5")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className={cn("text-[11px] font-medium", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
