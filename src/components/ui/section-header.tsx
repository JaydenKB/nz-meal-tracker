export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-medium text-[var(--foreground)]">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-sm font-normal text-[var(--muted)]">{subtitle}</p>
      )}
    </div>
  );
}
