import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ai" | "outline";
};

type IconTone = "mint" | "amber" | "ai" | "blue" | "green";

const iconTones: Record<IconTone, string> = {
  mint: "bg-[var(--mint)] text-[var(--primary)] [background-image:linear-gradient(145deg,var(--mint-hero),var(--mint))]",
  amber: "text-white [background-image:var(--streak-gradient)]",
  ai: "bg-[var(--ai-soft)] text-[var(--ai)]",
  blue: "bg-[var(--blue-soft)] text-[#2d6a9f]",
  green: "bg-[var(--green-soft)] text-[var(--primary)]",
};

export function EmptyState({
  icon: Icon,
  iconTone = "mint",
  title,
  body,
  actions = [],
  tip,
  className,
}: {
  icon: LucideIcon;
  iconTone?: IconTone;
  title: string;
  body: string;
  actions?: EmptyAction[];
  tip?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-5 py-8 text-center shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div
        className={cn(
          "empty-float mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--radius-icon)] shadow-[var(--shadow-sm)]",
          iconTones[iconTone],
        )}
      >
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[280px] text-sm leading-relaxed text-[var(--muted)]">
        {body}
      </p>
      {actions.length > 0 && (
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {actions.map((action) => {
            const btn = (
              <Button
                key={action.label}
                variant={action.variant ?? "primary"}
                size="default"
                className="w-full sm:w-auto"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
            if (action.href) {
              return (
                <Link key={action.label} href={action.href} className="w-full sm:w-auto">
                  {btn}
                </Link>
              );
            }
            return btn;
          })}
        </div>
      )}
      {tip && (
        <p className="mt-4 rounded-[var(--radius)] bg-[var(--beige)] px-3 py-2 text-xs leading-relaxed text-[var(--muted)]">
          {tip}
        </p>
      )}
    </div>
  );
}
