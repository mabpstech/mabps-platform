import { isUnlimited } from "@/lib/billing/engine/limits";
import { getPlan, getPlanDisplayName } from "@/lib/billing/engine/plans";
import type {
  MonthlyUsageMetric,
  UsageLimitExceededResult,
  UsageMutationResult,
  UsageRecord,
  UsageTrackingMetric,
  UsageTrackingSnapshot,
} from "@/lib/billing/engine/types";
import {
  MONTHLY_USAGE_METRICS,
  USAGE_TRACKING_METRICS,
} from "@/lib/billing/engine/types";
import type { PlanId, PlanLimits } from "@/lib/billing/plans";

/**
 * Map tracking metrics → PlanLimits keys.
 * `mediaAssets` has no plan quota yet — treated as unlimited unless overridden.
 */
const PLAN_LIMIT_KEY_BY_METRIC: Record<
  UsageTrackingMetric,
  keyof PlanLimits | null
> = {
  websitesCreated: "sites",
  storageMb: "storageMb",
  aiRequests: "aiCredits",
  automationRuns: "automations",
  teamMembers: "members",
  mediaAssets: null,
};

const MONTHLY_METRIC_SET = new Set<string>(MONTHLY_USAGE_METRICS);

/**
 * Provider-independent Usage Tracking helpers.
 * Pure functions over structured records — no payment gateway, no DB, no UI.
 */

export function currentUsagePeriodKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function createEmptyUsageCounters(): UsageTrackingSnapshot {
  const counters = {} as UsageTrackingSnapshot;
  for (const metric of USAGE_TRACKING_METRICS) {
    counters[metric] = 0;
  }
  return counters;
}

/**
 * Build a structured usage record ready for future persistence.
 */
export function createUsageRecord(
  workspaceId: string,
  input: {
    id?: string;
    periodKey?: string;
    counters?: Partial<UsageTrackingSnapshot>;
    now?: Date;
  } = {},
): UsageRecord {
  const now = input.now ?? new Date();
  const iso = now.toISOString();
  return {
    id: input.id ?? createUsageRecordId(),
    workspaceId,
    periodKey: input.periodKey ?? currentUsagePeriodKey(now),
    counters: {
      ...createEmptyUsageCounters(),
      ...(input.counters ?? {}),
    },
    createdAt: iso,
    updatedAt: iso,
  };
}

export function getCurrentUsage(record: UsageRecord): UsageTrackingSnapshot {
  return { ...record.counters };
}

export function incrementUsage(
  record: UsageRecord,
  metric: UsageTrackingMetric,
  amount = 1,
  input: { now?: Date } = {},
): UsageMutationResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("incrementUsage amount must be a non-negative finite number.");
  }
  return mutateUsage(record, metric, amount, input.now);
}

export function decrementUsage(
  record: UsageRecord,
  metric: UsageTrackingMetric,
  amount = 1,
  input: { now?: Date } = {},
): UsageMutationResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("decrementUsage amount must be a non-negative finite number.");
  }
  return mutateUsage(record, metric, -amount, input.now);
}

/**
 * Reset monthly counters (AI requests, automation runs) for a new period.
 * Lifetime counters (sites, storage, members, media) are preserved.
 */
export function resetMonthlyUsage(
  record: UsageRecord,
  input: { periodKey?: string; now?: Date } = {},
): UsageRecord {
  const now = input.now ?? new Date();
  const counters = { ...record.counters };
  for (const metric of MONTHLY_USAGE_METRICS) {
    counters[metric] = 0;
  }
  return {
    ...record,
    periodKey: input.periodKey ?? currentUsagePeriodKey(now),
    counters,
    updatedAt: now.toISOString(),
  };
}

export function isLimitExceeded(
  record: UsageRecord,
  metric: UsageTrackingMetric,
  input: {
    planId?: PlanId;
    limits?: PlanLimits;
    /** Explicit cap; wins over plan limits. -1 = unlimited. */
    limit?: number;
    /** Projected increase before the check (e.g. pending increment). */
    delta?: number;
  } = {},
): UsageLimitExceededResult {
  const current = record.counters[metric];
  const projected = current + (input.delta ?? 0);
  const limit = resolveMetricLimit(metric, input);
  const unlimited = isUnlimited(limit);

  if (unlimited) {
    return {
      exceeded: false,
      metric,
      current,
      limit,
      remaining: null,
      unlimited: true,
    };
  }

  const exceeded = projected > limit;
  const remaining = Math.max(0, limit - current);
  return {
    exceeded,
    metric,
    current,
    limit,
    remaining,
    unlimited: false,
    reason: exceeded
      ? buildExceededReason(metric, limit, input.planId)
      : undefined,
  };
}

export function listUsageTrackingMetrics(): readonly UsageTrackingMetric[] {
  return USAGE_TRACKING_METRICS;
}

export function listMonthlyUsageMetrics(): readonly MonthlyUsageMetric[] {
  return MONTHLY_USAGE_METRICS;
}

export function isUsageTrackingMetric(
  value: string,
): value is UsageTrackingMetric {
  return (USAGE_TRACKING_METRICS as readonly string[]).includes(value);
}

export function isMonthlyUsageMetric(value: string): value is MonthlyUsageMetric {
  return MONTHLY_METRIC_SET.has(value);
}

/**
 * Resolve the plan limit for a tracking metric (null → unlimited until plans gain a quota).
 */
export function getPlanLimitForMetric(
  metric: UsageTrackingMetric,
  limits: PlanLimits,
): number {
  const key = PLAN_LIMIT_KEY_BY_METRIC[metric];
  if (!key) {
    return -1;
  }
  return limits[key];
}

function mutateUsage(
  record: UsageRecord,
  metric: UsageTrackingMetric,
  delta: number,
  now = new Date(),
): UsageMutationResult {
  const previous = record.counters[metric];
  const current = Math.max(0, previous + delta);
  return {
    record: {
      ...record,
      counters: {
        ...record.counters,
        [metric]: current,
      },
      updatedAt: now.toISOString(),
    },
    metric,
    previous,
    current,
    delta: current - previous,
  };
}

function resolveMetricLimit(
  metric: UsageTrackingMetric,
  input: {
    planId?: PlanId;
    limits?: PlanLimits;
    limit?: number;
  },
): number {
  if (typeof input.limit === "number") {
    return input.limit;
  }
  const limits = input.limits ?? (input.planId ? getPlan(input.planId).limits : null);
  if (!limits) {
    return -1;
  }
  return getPlanLimitForMetric(metric, limits);
}

function buildExceededReason(
  metric: UsageTrackingMetric,
  limit: number,
  planId?: PlanId,
): string {
  const planLabel = planId ? `${getPlanDisplayName(planId)} plan` : "Current plan";
  return `You've reached your ${planLabel} limit (${formatTrackingCap(limit, metric)}). Upgrade to continue.`;
}

function formatTrackingCap(limit: number, metric: UsageTrackingMetric): string {
  const formatted = limit.toLocaleString("en-US");
  const plural = limit !== 1;
  switch (metric) {
    case "websitesCreated":
      return `${formatted} ${plural ? "websites" : "website"}`;
    case "storageMb":
      return `${formatted} MB storage`;
    case "aiRequests":
      return `${formatted} ${plural ? "AI requests / month" : "AI request / month"}`;
    case "automationRuns":
      return `${formatted} ${plural ? "automation runs" : "automation run"}`;
    case "teamMembers":
      return `${formatted} ${plural ? "team members" : "team member"}`;
    case "mediaAssets":
      return `${formatted} ${plural ? "media assets" : "media asset"}`;
    default:
      return formatted;
  }
}

function createUsageRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `usage_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
