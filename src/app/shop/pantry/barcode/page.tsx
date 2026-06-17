import { redirect } from "next/navigation";

export default function PantryBarcodePage() {
  redirect("/ingredients/barcode?from=pantry");
}
