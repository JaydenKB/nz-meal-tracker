import { NextResponse } from "next/server";
import { getLanAddresses, getPrimaryLanAddress } from "@/lib/network";

export const runtime = "nodejs";

export async function GET() {
  const addresses = getLanAddresses();
  const port = process.env.PORT ?? "3000";
  const primary = getPrimaryLanAddress();

  return NextResponse.json({
    addresses: addresses.map((ip) => `http://${ip}:${port}`),
    primaryUrl: primary ? `http://${primary}:${port}` : null,
    port,
  });
}
