import { Suspense } from "react";
import { BarcodeScanClient } from "@/components/ingredients/barcode-scan-client";

export const dynamic = "force-dynamic";

export default function BarcodeScanPage() {
  return (
    <Suspense>
      <BarcodeScanClient />
    </Suspense>
  );
}
