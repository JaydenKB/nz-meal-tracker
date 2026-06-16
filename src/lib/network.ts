import os from "os";

const VIRTUAL_PREFIXES = [
  "vEthernet",
  "VirtualBox",
  "VMware",
  "Hyper-V",
  "WSL",
  "Docker",
  "Default Switch",
  "Loopback",
  "Npcap",
  "Tailscale",
];

const PREFERRED_NAMES = ["Wi-Fi", "WiFi", "Ethernet", "WLAN"];

function isVirtualInterface(name: string): boolean {
  return VIRTUAL_PREFIXES.some((prefix) => name.includes(prefix));
}

function isUsableAddress(address: string): boolean {
  if (address.startsWith("169.254.")) return false;
  if (address.startsWith("127.")) return false;
  return true;
}

export function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const candidates: { name: string; address: string; preferred: boolean }[] = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries || isVirtualInterface(name)) continue;

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (!isUsableAddress(entry.address)) continue;

      candidates.push({
        name,
        address: entry.address,
        preferred: PREFERRED_NAMES.some((p) => name.includes(p)),
      });
    }
  }

  candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred));

  return [...new Set(candidates.map((c) => c.address))];
}

export function getPrimaryLanAddress(): string | null {
  return getLanAddresses()[0] ?? null;
}
