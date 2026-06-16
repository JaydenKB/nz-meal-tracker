"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NetworkInfo = {
  addresses: string[];
  port: string;
  primaryUrl: string | null;
};

export function LanUrlCard() {
  const [info, setInfo] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then((data) => setInfo(data))
      .catch(() => setInfo(null));
  }, []);

  if (!info?.primaryUrl) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
      <CardHeader>
        <CardTitle className="text-emerald-800 dark:text-emerald-300">Open on your phone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Same WiFi as this PC (not mobile data). Use this URL:
        </p>
        <a
          href={info.primaryUrl}
          className="block rounded-lg bg-white px-3 py-3 font-mono text-base font-semibold text-emerald-700 underline dark:bg-zinc-900 dark:text-emerald-400"
        >
          {info.primaryUrl}
        </a>
        {info.addresses.length > 1 && (
          <p className="text-xs text-zinc-500">
            Other addresses: {info.addresses.slice(1).map((ip) => `http://${ip}:${info.port}`).join(", ")}
          </p>
        )}
        <details className="text-sm text-zinc-500">
          <summary className="cursor-pointer font-medium">Phone not connecting?</summary>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Phone must be on the same WiFi network as this PC</li>
            <li>Use <strong>http://</strong> not https://</li>
            <li>Run <code className="rounded bg-white px-1 dark:bg-zinc-900">scripts\setup-firewall.ps1</code> as Administrator</li>
            <li>In Windows Settings → WiFi → Deco/your network → set profile to <strong>Private</strong></li>
            <li>Check your router for &quot;AP isolation&quot; or guest network — disable it</li>
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
