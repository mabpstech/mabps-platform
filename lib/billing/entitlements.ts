import {
  formatLimit,
  getPlan,
  type PlanId,
  type PlanLimits,
} from "@/lib/billing/plans";
import {
  countPendingInvitations,
  countWorkspaceMembers,
  ensureFreeSubscription,
  getUsageValue,
  setUsageValue,
} from "@/lib/billing/repository";
import type { UsageMetric, UsageSnapshot } from "@/lib/billing/types";
import { CacheKeys, cacheGetOrSet } from "@/lib/platform/cache";
import { countSitesForWorkspace } from "@/lib/website/repository";

export type LimitCheckResult = {
  allowed: boolean;
  planId: PlanId;
  metric: UsageMetric;
  limit: number;
  current: number;
  remaining: number | null;
  message?: string;
};

function currentPeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getWorkspacePlanId(workspaceId: string): PlanId {
  return cacheGetOrSet(CacheKeys.planId(workspaceId), () =>
    ensureFreeSubscription(workspaceId).planId,
  );
}

export function getWorkspaceLimits(workspaceId: string): PlanLimits {
  const planId = getWorkspacePlanId(workspaceId);
  return getPlan(planId).limits;
}

export function getWorkspaceUsage(workspaceId: string): UsageSnapshot {
  const periodKey = currentPeriodKey();
  const members =
    countWorkspaceMembers(workspaceId) + countPendingInvitations(workspaceId);

  // Sites usage must match live site rows — counters can drift after deletes.
  const sites = countSitesForWorkspace(workspaceId);
  const storedSites = getUsageValue(workspaceId, "sites", "lifetime");
  if (storedSites !== sites) {
    setUsageValue(workspaceId, "sites", "lifetime", sites);
  }

  return {
    members,
    sites,
    storageMb: getUsageValue(workspaceId, "storageMb", "lifetime"),
    aiCredits: getUsageValue(workspaceId, "aiCredits", periodKey),
    automations: getUsageValue(workspaceId, "automations", "lifetime"),
    plugins: getUsageValue(workspaceId, "plugins", "lifetime"),
  };
}

export function checkLimit(
  workspaceId: string,
  metric: UsageMetric,
  options: { delta?: number; projected?: number } = {},
): LimitCheckResult {
  const planId = getWorkspacePlanId(workspaceId);
  const limits = getPlan(planId).limits;
  const usage = getWorkspaceUsage(workspaceId);
  const limit = limits[metric];
  const current = options.projected ?? usage[metric];
  const next = current + (options.delta ?? 0);

  if (limit < 0) {
    return {
      allowed: true,
      planId,
      metric,
      limit,
      current,
      remaining: null,
    };
  }

  const allowed = next <= limit;
  const remaining = Math.max(0, limit - current);

  return {
    allowed,
    planId,
    metric,
    limit,
    current,
    remaining,
    message: allowed
      ? undefined
      : `${getPlan(planId).name} plan allows ${formatLimit(limit, metricLabel(metric))}. Upgrade to continue.`,
  };
}

function metricLabel(metric: UsageMetric): string {
  switch (metric) {
    case "members":
      return "members";
    case "sites":
      return "sites";
    case "storageMb":
      return "MB storage";
    case "aiCredits":
      return "AI credits / month";
    case "automations":
      return "automations";
    case "plugins":
      return "marketplace plugins";
    default:
      return metric;
  }
}

/**
 * Assert a usage limit for upcoming product actions.
 * Throws an Error with a user-safe message when exceeded.
 */
export function assertWithinLimit(
  workspaceId: string,
  metric: UsageMetric,
  options: { delta?: number; projected?: number } = {},
): void {
  const result = checkLimit(workspaceId, metric, options);
  if (!result.allowed) {
    throw new Error(result.message ?? "Plan limit exceeded.");
  }
}

export function canInviteMembers(
  workspaceId: string,
  inviteCount = 1,
): LimitCheckResult {
  return checkLimit(workspaceId, "members", { delta: inviteCount });
}
