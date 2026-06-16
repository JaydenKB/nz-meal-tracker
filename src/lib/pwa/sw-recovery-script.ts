/** Runs synchronously before React — clears stale PWA caches that break hydration on LAN. */
export const SW_RECOVERY_SCRIPT = `(function(){
  try {
    var h = location.hostname;
    var local =
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.endsWith(".local") ||
      /^192\\.168\\./.test(h) ||
      /^10\\./.test(h) ||
      /^172\\.(1[6-9]|2\\d|3[01])\\./.test(h);
    if (!local || !("serviceWorker" in navigator)) return;

    var KEY = "meal-sw-cleared-v5";
    var clearAll = function() {
      return Promise.all([
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          return Promise.all(regs.map(function(r) { return r.unregister(); }));
        }),
        "caches" in window
          ? caches.keys().then(function(keys) {
              return Promise.all(keys.map(function(k) { return caches.delete(k); }));
            })
          : Promise.resolve(),
      ]);
    };

    if (navigator.serviceWorker.controller && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, "1");
      clearAll().then(function() { location.reload(); });
      return;
    }

    if (!navigator.serviceWorker.controller) {
      sessionStorage.removeItem(KEY);
    }

    clearAll();
  } catch (e) {}
})();`;
