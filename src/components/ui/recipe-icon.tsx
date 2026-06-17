import { getRecipeAccent } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function RecipeIcon({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  return (
    <div
      className={cn("shrink-0 rounded-[var(--radius-icon)]", className ?? "h-11 w-11")}
      style={{ backgroundColor: getRecipeAccent(index) }}
    />
  );
}
