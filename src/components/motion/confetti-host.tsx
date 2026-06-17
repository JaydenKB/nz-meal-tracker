"use client";

import { useEffect, useState } from "react";
import { ConfettiBurst } from "@/components/motion/confetti-burst";

let fire: (() => void) | null = null;

export function fireConfetti() {
  fire?.();
}

export function ConfettiHost() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    fire = () => setActive(true);
    return () => {
      fire = null;
    };
  }, []);

  return (
    <ConfettiBurst
      active={active}
      onComplete={() => setActive(false)}
    />
  );
}
