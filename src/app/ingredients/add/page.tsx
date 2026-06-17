import { redirect } from "next/navigation";

export default function IngredientsAddPage() {
  redirect("/shop/pantry/add?context=ingredient");
}
