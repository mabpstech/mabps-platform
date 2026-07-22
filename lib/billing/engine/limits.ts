import { getPlanDisplayName } from "@/lib/billing/engine/plans";
import type {
  UsageLimit,
  UsageLimitSnapshot,
} from "@/lib/billing/engine/types";
import type { PlanId, PlanLimits } from "@/lib/billing/plans";
import type { UsageMetric, UsageSnapshot } from "@/lib/billing/types";

const USAGE_METRICS: readonly UsageMetric[] = [
  "members",
  "sites",
  "storageMb",
  "aiCredits",
  "automations",
  "plugins",
] as const;

export type LimitEvaluation = {
  allowed: boolean;
  planId: PlanId;
  metric: UsageMetric;
  limit: number;
  current: number;
  remaining: number | null;
  unlimited: boolean;
  message?: string;
};

/** -1 means unlimited across the Billing Engine. */
export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function buildUsageLimit(
  metric: UsageMetric,
  limit: number,
  current: number,
): UsageLimit {
  const unlimited = isUnlimited(limit);
  return {
    metric,
    limit,
    current,
    remaining: unlimited ? null : Math.max(0, limit - current),
    unlimited,
  };
}

export function buildUsageLimitSnapshot(
  limits: PlanLimits,
  usage: UsageSnapshot,
): UsageLimitSnapshot {
  const snapshot = {} as UsageLimitSnapshot;
  for (const metric of USAGE_METRICS) {
    snapshot[metric] = buildUsageLimit(metric, limits[metric], usage[metric]);
  }
  return snapshot;
}

export function evaluateUsageLimit(input: {
  planId: PlanId;
  metric: UsageMetric;
  limit: number;
  current: number;
  delta?: number;
}): LimitEvaluation {
  const { planId, metric, limit, current } = input;
  const next = current + (input.delta ?? 0);
  const unlimited = isUnlimited(limit);

  if (unlimited) {
    return {
      allowed: true,
      planId,
      metric,
      limit,
      current,
      remaining: null,
      unlimited: true,
    };
  }

  const allowed = next <= limit;
  return {
    allowed,
    planId,
    metric,
    limit,
    current,
    remaining: Math.max(0, limit - current),
    unlimited: false,
    message: allowed
      ? undefined
      : `${getPlanDisplayName(planId)} plan allows ${formatUsageCap(limit, metric)}. Upgrade to continue.`,
  };
}

/**
 * Metrics where current usage already exceeds a candidate plan's limits.
 * Used when preparing downgrades.
 */
export function findBlockingUsageMetrics(
  limits: PlanLimits,
  usage: UsageSnapshot,
): UsageMetric[] {
  const blocking: UsageMetric[] = [];
  for (const metric of USAGE_METRICS) {
    const limit = limits[metric];
    if (isUnlimited(limit)) continue;
    if (usage[metric] > limit) {
      blocking.push(metric);
    }
  }
  return blocking;
}

export function listUsageMetrics(): readonly UsageMetric[] {
  return USAGE_METRICS;
}

function formatUsageCap(limit: number, metric: UsageMetric): string {
  const formatted = limit.toLocaleString("en-US");
  switch (metric) {
    case "members":
      return `${formatted} members`;
    case "sites":
      return `${formatted} sites`;
    case "storageMb":
      return `${formatted} MB storage`;
    case "aiCredits":
      return `${formatted} AI credits / month`;
    case "automations":
      return `${formatted} automations`;
    case "plugins":
      return `${formatted} marketplace plugins`;
    default:
      return formatted;
  }
}
