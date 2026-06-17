import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer rounded-[var(--radius)]", className)} aria-hidden />;
}

export function SkeletonLine({ className, width = "w-full" }: { className?: string; width?: string }) {
  return <Skeleton className={cn("h-3.5", width, className)} />;
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={cn("h-20", className)} />;
}

export function SkeletonCardRow() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-[var(--radius-icon)]" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine width="w-3/5" />
        <SkeletonLine width="w-2/5" className="h-2.5" />
      </div>
    </div>
  );
}

export function RecipeListSkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading recipes">
      <Skeleton className="aspect-[1.4/1] w-full rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[var(--radius-card)]" />
        ))}
      </div>
    </div>
  );
}

export function WeekCalendarSkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Loading week">
      <Skeleton className="h-20 rounded-[var(--radius-card)]" />
      <div className="flex gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 min-w-[3rem] flex-1 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCardRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function PantryListSkeleton() {
  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-2" aria-busy aria-label="Loading pantry">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-10 w-10 rounded-[var(--radius-icon)]" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="w-1/2" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          <SkeletonLine width="w-12" />
        </div>
      ))}
    </div>
  );
}

export function IngredientListSkeleton() {
  return (
    <div className="space-y-2" aria-busy aria-label="Loading ingredients">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCardRow key={i} />
      ))}
    </div>
  );
}

export function LogPickerSkeleton() {
  return (
    <div className="space-y-2" aria-busy aria-label="Loading items">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCardRow key={i} />
      ))}
    </div>
  );
}
