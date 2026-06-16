"use client";

import { useEffect, useState } from "react";
import { Wifi } from "lucide-react";

export function ServerStatusBar() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then((data) => setUrl(data.primaryUrl ?? data.addresses?.[0] ?? null))
      .catch(() => setUrl(null));
  }, []);

  if (!url) return null;

  const display = url.replace("http://", "");

  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius)] bg-[var(--blue-soft)] px-4 py-3 text-sm text-[#2d6a9f]">
      <Wifi className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>
        Server live at <span className="font-semibold">{display}</span>
      </span>
    </div>
  );
}
