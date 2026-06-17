import { WeekCalendarClient } from "@/components/calendar/week-calendar-client";
import { getCookFromPantryMatches } from "@/lib/pantry/cook-from-pantry";
import { countUnresolvedPastPlanned } from "@/lib/log/catch-up";
import { getLoggingDates, computeStreak } from "@/lib/progress/stats";
import { getDailyGoals } from "@/lib/log/queries";
import { seedDatabase } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await seedDatabase();

  const [dates, goals, pantry, catchUpCount] = await Promise.all([
    getLoggingDates(),
    getDailyGoals(),
    getCookFromPantryMatches("all"),
    countUnresolvedPastPlanned(),
  ]);
  const { current: streakDays } = computeStreak(dates);

  return (
    <WeekCalendarClient
      streakDays={streakDays}
      calorieTarget={goals.calorieTarget}
      cookNowCount={pantry.cookNowCount}
      catchUpCount={catchUpCount}
    />
  );
}
