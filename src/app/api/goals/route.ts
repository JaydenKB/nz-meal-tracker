import { NextResponse } from "next/server";
import { getDailyGoals, updateDailyGoals } from "@/lib/log/queries";

export const runtime = "nodejs";

export async function GET() {
  const goals = await getDailyGoals();
  return NextResponse.json(goals);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const goals = await updateDailyGoals({
    calorieTarget: body.calorieTarget != null ? Number(body.calorieTarget) : undefined,
    proteinTargetG: body.proteinTargetG != null ? Number(body.proteinTargetG) : undefined,
    fatTargetG: body.fatTargetG != null ? Number(body.fatTargetG) : undefined,
    carbTargetG: body.carbTargetG != null ? Number(body.carbTargetG) : undefined,
  });
  return NextResponse.json(goals);
}
