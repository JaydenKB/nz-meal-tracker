import { NextResponse } from "next/server";
import { buildShoppingCostSummary } from "@/lib/cost/estimate";
import {
  filterPlannedShoppingEntries,
  getLogEntriesForDateRange,
} from "@/lib/calendar/queries";
import { endOfWeek, startOfWeek } from "@/lib/calendar/week";
import { getPantryMap } from "@/lib/pantry/queries";
import { buildWeekShoppingList } from "@/lib/shopping/weekList";
import { todayString } from "@/lib/log/compute";
import { db } from "@/lib/db";
import { ingredients, storeProducts, stores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = startOfWeek(searchParams.get("weekStart") ?? todayString());
  const weekEnd = endOfWeek(weekStart);
  const scope = searchParams.get("scope") ?? "planned";
  const entryIdsParam = searchParams.get("entryIds");

  let allEntries = await getLogEntriesForDateRange(weekStart, weekEnd);
  let scopeLabel = "Planned meals this week (excludes already eaten)";

  if (entryIdsParam) {
    const ids = new Set(entryIdsParam.split(",").map(Number).filter(Boolean));
    allEntries = allEntries.filter((e) => ids.has(e.id));
    scopeLabel = `${allEntries.length} selected meal${allEntries.length === 1 ? "" : "s"}`;
  } else if (scope === "planned") {
    allEntries = filterPlannedShoppingEntries(allEntries);
  } else if (scope === "all") {
    scopeLabel = "All meals this week (planned + eaten)";
  }

  const productRows = await db
    .select()
    .from(storeProducts)
    .innerJoin(stores, eq(storeProducts.storeId, stores.id))
    .innerJoin(ingredients, eq(storeProducts.ingredientId, ingredients.id));

  const products = productRows.map((r) => ({
    ...r.store_products,
    store: r.stores,
    ingredient: r.ingredients,
  }));

  const pantryMap = await getPantryMap();
  const shopping = await buildWeekShoppingList(allEntries, products, pantryMap);

  const costSummary = buildShoppingCostSummary(
    shopping.groups,
    products.map((p) => ({
      ingredientId: p.ingredientId,
      productName: p.productName,
      storeId: p.storeId,
      priceNzd: p.priceNzd,
    })),
  );

  return NextResponse.json({
    weekStart,
    weekEnd,
    scope,
    scopeLabel,
    mealCount: allEntries.length,
    shopping,
    costSummary,
  });
}
