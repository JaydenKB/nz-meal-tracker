import { WeekCalendarClient } from "@/components/calendar/week-calendar-client";
import { getLoggingDates, computeStreak } from "@/lib/progress/stats";
import { getDailyGoals } from "@/lib/log/queries";
import { seedDatabase } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  await seedDatabase();

  const [dates, goals] = await Promise.all([getLoggingDates(), getDailyGoals()]);
  const { current: streakDays } = computeStreak(dates);

  return <WeekCalendarClient streakDays={streakDays} calorieTarget={goals.calorieTarget} />;
}
