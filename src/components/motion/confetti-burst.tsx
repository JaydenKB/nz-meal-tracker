"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  vr: number;
};

const COLORS = ["#0f6e56", "#ef9f27", "#639922", "#534ab7", "#f5b84a", "#128a6a"];

export function ConfettiBurst({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) {
      onComplete?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;

    const particles: Particle[] = Array.from({ length: 48 }, () => ({
      x: w * 0.5 + (Math.random() - 0.5) * 80,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 12 - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: 4 + Math.random() * 5,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 12,
    }));

    let frame = 0;
    const maxFrames = 55;
    let raf = 0;

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      frame++;
      if (frame < maxFrames) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        onComplete?.();
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduced, onComplete]);

  if (!active || reduced) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[300]"
      aria-hidden
    />
  );
}
