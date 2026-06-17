import { Suspense } from "react";
import { PhotoRestockCreateClient } from "@/components/pantry/photo-restock-create-client";

export const dynamic = "force-dynamic";

export default function PhotoRestockCreatePage() {
  return (
    <Suspense>
      <PhotoRestockCreateClient />
    </Suspense>
  );
}
