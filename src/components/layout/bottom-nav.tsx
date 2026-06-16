"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, Leaf, PlusSquare, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/today", label: "Today", icon: ClipboardList },
  { href: "/", label: "Home", icon: Home },
  { href: "/recipes/new", label: "New", icon: PlusSquare },
  { href: "/ingredients", label: "Ingredients", icon: Leaf },
  { href: "/stores", label: "Stores", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white">
      <div className="mx-auto flex max-w-[430px] items-center justify-around px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 transition-colors",
                active ? "text-[var(--primary)]" : "text-[var(--muted)]",
              )}
              aria-label={label}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
