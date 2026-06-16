import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "green" | "blue" | "amber" | "default";
  className?: string;
};

const tones = {
  green: "bg-[var(--success-soft)] text-[var(--foreground)]",
  blue: "bg-[var(--blue-soft)] text-[var(--foreground)]",
  amber: "bg-[var(--streak-soft)] text-[var(--foreground)]",
  default: "bg-[var(--beige)] text-[var(--foreground)]",
};

export function StatCard({ label, value, sub, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--border)] px-4 py-4",
        tones[tone],
        className,
      )}
    >
      <p className="text-xs font-normal text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-medium leading-none">{value}</p>
      {sub && <div className="mt-1.5 text-xs font-medium">{sub}</div>}
    </div>
  );
}
