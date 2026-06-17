/** Feature-detected vibration feedback (Android PWA; silent no-op elsewhere). */

const STORAGE_KEY = "meal-tracker-haptics";

export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setHapticsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
}

export function haptic(type: "light" | "success" | "milestone") {
  if (!hapticsEnabled() || typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    const patterns: Record<typeof type, number | number[]> = {
      light: 8,
      success: [12, 40, 12],
      milestone: [15, 50, 15, 50, 20],
    };
    navigator.vibrate(patterns[type]);
  } catch {
    /* silent */
  }
}
