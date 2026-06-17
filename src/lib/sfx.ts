/** Client-only reward sounds via Web Audio API (no audio files). */

export type SfxType = "log" | "goalHit" | "streak" | "milestone" | "error";

const STORAGE_KEY = "meal-tracker-sfx";

const PRIORITY: SfxType[] = ["milestone", "streak", "goalHit", "log"];

let audioCtx: AudioContext | null = null;
let gestureHookInstalled = false;

export function sfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setSfxEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
}

/** Resume/create AudioContext on first user gesture (iOS autoplay policy). */
export function initSfxOnFirstGesture() {
  if (typeof window === "undefined" || gestureHookInstalled) return;
  gestureHookInstalled = true;

  const unlock = () => {
    try {
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") void audioCtx.resume();
    } catch {
      /* silent */
    }
  };

  for (const event of ["pointerdown", "touchstart", "keydown"] as const) {
    window.addEventListener(event, unlock, { once: true, passive: true });
  }
}

function getContext(): AudioContext | null {
  if (!sfxEnabled() || typeof window === "undefined") return null;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  peakGain: number,
  duration: number,
  type: OscillatorType = "sine",
) {
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(Math.max(0.001, peakGain), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function playSlide(
  ctx: AudioContext,
  freqFrom: number,
  freqTo: number,
  startOffset: number,
  peakGain: number,
  duration: number,
) {
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freqFrom, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(Math.max(0.001, peakGain), t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

function dispatchSound(ctx: AudioContext, type: SfxType) {
  switch (type) {
    case "log":
      playTone(ctx, 660, 0, 0.16, 0.16);
      break;
    case "goalHit":
      playTone(ctx, 587, 0, 0.18, 0.2);
      playTone(ctx, 880, 0.22, 0.2, 0.25);
      break;
    case "streak":
      playTone(ctx, 523, 0, 0.18, 0.18, "triangle");
      playTone(ctx, 659, 0.2, 0.19, 0.18, "triangle");
      playTone(ctx, 784, 0.4, 0.2, 0.22, "triangle");
      break;
    case "milestone":
      playTone(ctx, 523, 0, 0.2, 0.16);
      playTone(ctx, 659, 0.18, 0.2, 0.16);
      playTone(ctx, 784, 0.36, 0.21, 0.18);
      playTone(ctx, 1047, 0.54, 0.22, 0.28);
      break;
    case "error":
      playSlide(ctx, 220, 180, 0, 0.08, 0.25);
      break;
  }
}

/** Play a single reward / feedback sound. */
export function play(type: SfxType) {
  if (!sfxEnabled()) return;
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    dispatchSound(ctx, type);
  } catch {
    /* enhancement only */
  }
}

/** When multiple events fire at once, play only the richest sound. */
export function playHighest(types: SfxType[]) {
  for (const tier of PRIORITY) {
    if (types.includes(tier)) {
      play(tier);
      return;
    }
  }
  if (types.includes("error")) play("error");
}

/** @deprecated Use play('log') */
export function playLogSound() {
  play("log");
}

/** Timer finished — two-note chime (cooking mode). */
export function playTimerDoneSound() {
  play("goalHit");
}
