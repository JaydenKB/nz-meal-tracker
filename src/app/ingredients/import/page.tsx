import { ImportPageClient } from "@/components/import/import-page";
import { getAllStores } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ImportIngredientsPage() {
  const stores = await getAllStores();
  return (
    <ImportPageClient
      initialStores={stores.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
