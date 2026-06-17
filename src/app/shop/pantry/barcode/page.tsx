import { redirect } from "next/navigation";

export default function PantryBarcodeRedirect() {
  redirect("/shop/pantry/add");
}
