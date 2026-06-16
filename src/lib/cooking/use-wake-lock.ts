"use client";

import { useEffect } from "react";

/** Keep the screen awake during cooking. Fails gracefully when unsupported. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        if (document.visibilityState === "visible") {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* unsupported or denied */
      }
    }

    void acquire();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
