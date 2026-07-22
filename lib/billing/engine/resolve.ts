import { getFeatureEntitlements } from "@/lib/billing/engine/entitlements";
import { buildUsageLimitSnapshot } from "@/lib/billing/engine/limits";
import {
  getPlan,
  getPlanDisplayName,
} from "@/lib/billing/engine/plans";
import {
  getTrialDaysRemaining,
  isSubscriptionTrialing,
} from "@/lib/billing/engine/trial";
import {
  toEngineSubscription,
  type ResolvedPlan,
  type Subscription,
} from "@/lib/billing/engine/types";
import {
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import type { PlanId } from "@/lib/billing/plans";
import {
  ensureFreeSubscription,
  getSubscriptionByWorkspaceId,
} from "@/lib/billing/repository";
import type { WorkspaceSubscription } from "@/lib/billing/types";

/**
 * Resolve the workspace's current plan, entitlements, limits, and usage.
 * Always ensures a Free subscription exists (Core → Billing contract).
 */
export function resolveCurrentPlan(workspaceId: string): ResolvedPlan {
  const row = ensureFreeSubscription(workspaceId);
  return resolveFromSubscription(row);
}

/**
 * Resolve without creating a Free subscription. Returns null if none exists.
 */
export function tryResolveCurrentPlan(
  workspaceId: string,
): ResolvedPlan | null {
  const row = getSubscriptionByWorkspaceId(workspaceId);
  if (!row) return null;
  return resolveFromSubscription(row);
}

export function resolveFromSubscription(
  row: WorkspaceSubscription,
): ResolvedPlan {
  const subscription = toEngineSubscription(row);
  return resolveFromEngineSubscription(subscription);
}

export function resolveFromEngineSubscription(
  subscription: Subscription,
): ResolvedPlan {
  const planId = subscription.planId;
  const plan = getPlan(planId);
  const usage = getWorkspaceUsage(subscription.workspaceId);

  return {
    workspaceId: subscription.workspaceId,
    planId,
    planName: getPlanDisplayName(planId),
    interval: subscription.interval,
    status: subscription.status,
    subscription,
    limits: plan.limits,
    features: getFeatureEntitlements(planId),
    usage,
    usageLimits: buildUsageLimitSnapshot(plan.limits, usage),
    isTrialing: isSubscriptionTrialing(subscription),
    trialDaysRemaining: getTrialDaysRemaining(subscription),
  };
}

export function resolvePlanId(workspaceId: string): PlanId {
  return resolveCurrentPlan(workspaceId).planId;
}
