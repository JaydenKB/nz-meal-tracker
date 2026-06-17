"use client";

import { Volume2 } from "lucide-react";
import { play, type SfxType } from "@/lib/sfx";

const PREVIEWS: { type: SfxType; label: string; desc: string; tone: string }[] = [
  { type: "log", label: "Meal logged", desc: "Soft single pop", tone: "bg-[var(--mint)] text-[var(--primary)]" },
  { type: "goalHit", label: "Goal hit", desc: "Two-note rise", tone: "bg-[var(--blue-soft)] text-[#2d6a9f]" },
  { type: "streak", label: "Streak extended", desc: "Warm three-note", tone: "bg-[var(--streak-soft)] text-[var(--streak)]" },
  { type: "milestone", label: "Milestone earned", desc: "Triumphant arpeggio", tone: "bg-[var(--purple-soft)] text-[var(--ai)]" },
];

export function SfxPreview({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="space-y-3 border-b border-[var(--border)] bg-[var(--beige)] px-4 py-4">
      <div className="flex items-start gap-2 rounded-[var(--radius-card)] bg-[var(--blue-soft)] px-3 py-2.5 text-xs text-[#2d6a9f]">
        <Volume2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
        <p>Turn your volume up, then tap a button to hear each sound.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PREVIEWS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => play(item.type)}
            className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-3 text-left transition-opacity active:opacity-80"
          >
            <span
              className={`mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full ${item.tone}`}
            >
              <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
            <p className="text-xs text-[var(--muted)]">{item.desc}</p>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => play("error")}
        className="flex w-full items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-white px-3 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          <span className="text-sm font-medium">Gentle error</span>
        </div>
        <span className="text-xs text-[var(--muted)]">low soft blip</span>
      </button>
    </div>
  );
}
