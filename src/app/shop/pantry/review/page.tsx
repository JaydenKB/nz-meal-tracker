import { Suspense } from "react";
import { PantryReviewClient } from "@/components/pantry/pantry-review-client";

export const dynamic = "force-dynamic";

export default function PantryReviewPage() {
  return (
    <Suspense>
      <PantryReviewClient />
    </Suspense>
  );
}
