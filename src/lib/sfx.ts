const KEY = "meal-tracker-sfx";

export function sfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY) !== "off";
}

export function setSfxEnabled(on: boolean) {
  localStorage.setItem(KEY, on ? "on" : "off");
}

/** Short pop on successful log. */
export function playLogSound() {
  if (!sfxEnabled() || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* ignore */
  }
}

/** Timer finished — two-tone chime. */
export function playTimerDoneSound() {
  if (!sfxEnabled() || typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(660, ctx.currentTime, 0.2);
    playTone(880, ctx.currentTime + 0.22, 0.35);
  } catch {
    /* ignore */
  }
}
