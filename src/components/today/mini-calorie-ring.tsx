"use client";

import { CalorieRing } from "@/components/ui/calorie-ring";

export function MiniCalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  return (
    <CalorieRing
      consumed={consumed}
      target={target}
      variant="on-dark"
      showLabels
    />
  );
}
