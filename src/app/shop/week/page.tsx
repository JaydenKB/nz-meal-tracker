import { Suspense } from "react";
import { WeekShopClient } from "@/components/shop/week-shop-client";

export const dynamic = "force-dynamic";

export default function WeekShopPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-[var(--muted)]">Loading…</p>}>
      <WeekShopClient />
    </Suspense>
  );
}
