import { maybeRunScheduledBackup, runBackupNow } from "@/lib/backup/service";
import { getAppSettings } from "@/lib/log/queries";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let dailyCheckDone = false;

const DEBOUNCE_MS = 60_000;

/** Call after meaningful DB writes — debounced opportunistic backup. */
export function notifyDbWrite(): void {
  void (async () => {
    const settings = await getAppSettings();
    if (!settings.backupEnabled) return;
    if (settings.backupFrequency !== "on_change" && settings.backupFrequency !== "daily") return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void runBackupNow("on_change").catch(() => {});
    }, DEBOUNCE_MS);
  })();
}

/** Run once per process — daily backup if overdue. */
export function ensureDailyBackupCheck(): void {
  if (dailyCheckDone) return;
  dailyCheckDone = true;
  void maybeRunScheduledBackup();
}
