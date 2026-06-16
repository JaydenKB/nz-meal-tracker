import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
  secondary: "bg-[var(--beige)] text-[var(--foreground)] hover:bg-[#e8e4dc]",
  ghost: "bg-transparent text-[var(--muted)] hover:bg-[var(--beige)]",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  default: "h-11 px-5 text-sm font-semibold",
  sm: "h-9 px-3 text-sm font-medium",
  lg: "h-[52px] px-6 text-base font-semibold",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
