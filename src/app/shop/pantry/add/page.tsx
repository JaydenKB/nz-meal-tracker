import { Suspense } from "react";
import { PantryAddHubClient } from "@/components/pantry/pantry-add-hub-client";

export const dynamic = "force-dynamic";

export default function PantryAddPage() {
  return (
    <Suspense>
      <PantryAddHubClient />
    </Suspense>
  );
}
