import { notFound } from "next/navigation";
import { RecipePantryShortfallClient } from "@/components/recipes/recipe-pantry-shortfall-client";
import { getRecipePantryMatch } from "@/lib/pantry/cook-from-pantry";

export const dynamic = "force-dynamic";

export default async function RecipePantryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await getRecipePantryMatch(Number(id));
  if (!match) notFound();

  return <RecipePantryShortfallClient match={match} />;
}
