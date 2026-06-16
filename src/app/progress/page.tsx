import { ProgressPageClient } from "@/components/progress/progress-page";
import { getProgressStats } from "@/lib/progress/stats";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const stats = await getProgressStats();
  return <ProgressPageClient stats={stats} />;
}
