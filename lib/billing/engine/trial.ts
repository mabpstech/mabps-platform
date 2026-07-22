import type { PlanId } from "@/lib/billing/plans";
import type {
  Subscription,
  TrialConfig,
} from "@/lib/billing/engine/types";

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  defaultDays: 14,
  eligiblePlanIds: ["starter", "pro", "enterprise"],
};

export function isPlanTrialEligible(
  planId: PlanId,
  config: TrialConfig = DEFAULT_TRIAL_CONFIG,
): boolean {
  return config.eligiblePlanIds.includes(planId);
}

export function isSubscriptionTrialing(
  subscription: Pick<Subscription, "status" | "trialEnd">,
  now = new Date(),
): boolean {
  if (subscription.status === "trialing") {
    return true;
  }
  if (!subscription.trialEnd) {
    return false;
  }
  return new Date(subscription.trialEnd).getTime() > now.getTime();
}

export function getTrialDaysRemaining(
  subscription: Pick<Subscription, "trialEnd" | "status">,
  now = new Date(),
): number | null {
  if (!subscription.trialEnd) {
    return null;
  }
  const end = new Date(subscription.trialEnd).getTime();
  const remainingMs = end - now.getTime();
  if (remainingMs <= 0) {
    return 0;
  }
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function computeTrialEnd(
  start: Date = new Date(),
  days: number = DEFAULT_TRIAL_CONFIG.defaultDays,
): string {
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString();
}

/**
 * Build trial fields for a subscription draft.
 * Providers attach these when creating a trial checkout / subscription.
 */
export function buildTrialFields(input: {
  planId: PlanId;
  start?: Date;
  days?: number;
  config?: TrialConfig;
}): {
  status: "trialing";
  trialStart: string;
  trialEnd: string;
} | null {
  const config = input.config ?? DEFAULT_TRIAL_CONFIG;
  if (!isPlanTrialEligible(input.planId, config)) {
    return null;
  }
  const start = input.start ?? new Date();
  const days = input.days ?? config.defaultDays;
  return {
    status: "trialing",
    trialStart: start.toISOString(),
    trialEnd: computeTrialEnd(start, days),
  };
}

export function hasActiveTrialAccess(
  subscription: Pick<Subscription, "status" | "trialEnd" | "planId">,
  now = new Date(),
): boolean {
  if (subscription.planId === "free") {
    return false;
  }
  return isSubscriptionTrialing(subscription, now);
}
