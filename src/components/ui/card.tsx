import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pb-2", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 pt-2", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export function StatCard({
  value,
  label,
  className,
}: {
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-[var(--beige)] px-5 py-4",
        className,
      )}
    >
      <p className="text-[2rem] font-bold leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function SoftPanel({
  children,
  tone = "beige",
  className,
}: {
  children: React.ReactNode;
  tone?: "beige" | "blue" | "orange" | "green";
  className?: string;
}) {
  const tones = {
    beige: "bg-[var(--beige)]",
    blue: "bg-[var(--blue-soft)]",
    orange: "bg-[var(--orange-soft)]",
    green: "bg-[var(--green-soft)]",
  };

  return (
    <div className={cn("rounded-[var(--radius-lg)] px-4 py-3", tones[tone], className)}>
      {children}
    </div>
  );
}
