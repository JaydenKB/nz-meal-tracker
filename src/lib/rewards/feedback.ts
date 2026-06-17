import type { SfxType } from "@/lib/sfx";
import { showToast } from "@/components/toast/toast-provider";
import { fireConfetti } from "@/components/motion/confetti-host";
import { haptic } from "@/lib/haptics";

export type RewardFeedback = {
  message: string;
  tier: SfxType;
  confetti: boolean;
};

export function applyRewardFeedback(feedback: RewardFeedback) {
  showToast(feedback.message, "success");
  if (feedback.confetti) fireConfetti();
  if (feedback.tier === "milestone") haptic("milestone");
  else if (feedback.tier === "streak" || feedback.tier === "goalHit") haptic("success");
  else haptic("light");
}

export function toastAction(message: string, variant: "success" | "info" | "error" = "success") {
  showToast(message, variant);
}
