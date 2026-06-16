import { TodayLandingClient } from "@/components/today/today-landing";
import { getFrequentRecipes, getLoggingDates, computeStreak } from "@/lib/progress/stats";
import { seedDatabase } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await seedDatabase();

  const [dates, frequentRecipes] = await Promise.all([
    getLoggingDates(),
    getFrequentRecipes(4),
  ]);
  const { current: streakDays } = computeStreak(dates);

  return (
    <TodayLandingClient streakDays={streakDays} frequentRecipes={frequentRecipes} />
  );
}
