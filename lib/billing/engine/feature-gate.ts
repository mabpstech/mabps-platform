import {
  evaluateUsageLimit,
  isUnlimited,
} from "@/lib/billing/engine/limits";
import {
  hasLifecycleAccess,
  type LifecycleSubscription,
} from "@/lib/billing/engine/lifecycle";
import {
  PLAN_IDS,
  PLAN_RANK,
  getPlan,
  getPlanDisplayName,
  planHasFeature,
  type PlanId,
} from "@/lib/billing/engine/plans";
import type {
  BillingFeatureId,
  FeatureGateResult,
  Subscription,
  UpgradePlanId,
} from "@/lib/billing/engine/types";
import type { UsageMetric, UsageSnapshot } from "@/lib/billing/types";

/**
 * Account-level workspace quotas by plan.
 * Kept on the gate (not PlanLimits) because subscriptions are workspace-scoped.
 */
const WORKSPACE_QUOTAS: Record<PlanId, number> = {
  free: 1,
  starter: 3,
  pro: 10,
  enterprise: -1,
};

const UPGRADE_PLAN_IDS = ["starter", "pro", "enterprise"] as const satisfies readonly UpgradePlanId[];

export type FeatureGateInput = {
  planId: PlanId;
  /** When set, lifecycle access is enforced before feature / usage checks. */
  subscription?: LifecycleSubscription;
  usage?: Pick<UsageSnapshot, "sites" | "storageMb"> | UsageSnapshot;
  /** Current workspaces owned / held by the account for workspace quota checks. */
  workspaceCount?: number;
  now?: Date;
};

export type FeatureGateService = {
  canAccessFeature(feature: BillingFeatureId): FeatureGateResult;
  requireFeature(feature: BillingFeatureId): void;
  canCreateWebsite(): FeatureGateResult;
  canUseAI(): FeatureGateResult;
  canUseAutomation(): FeatureGateResult;
  canUseMarketplace(): FeatureGateResult;
  canCreateAnotherWebsite(delta?: number): FeatureGateResult;
  canUploadMoreMedia(deltaMb?: number): FeatureGateResult;
  canCreateAnotherWorkspace(delta?: number): FeatureGateResult;
};

/**
 * Central Feature Enforcement service — provider-independent, UI-free.
 */
export function createFeatureGate(input: FeatureGateInput): FeatureGateService {
  return {
    canAccessFeature(feature) {
      return canAccessFeature(input, feature);
    },
    requireFeature(feature) {
      requireFeature(input, feature);
    },
    canCreateWebsite() {
      return canCreateWebsite(input);
    },
    canUseAI() {
      return canUseAI(input);
    },
    canUseAutomation() {
      return canUseAutomation(input);
    },
    canUseMarketplace() {
      return canUseMarketplace(input);
    },
    canCreateAnotherWebsite(delta = 1) {
      return canCreateAnotherWebsite(input, delta);
    },
    canUploadMoreMedia(deltaMb = 1) {
      return canUploadMoreMedia(input, deltaMb);
    },
    canCreateAnotherWorkspace(delta = 1) {
      return canCreateAnotherWorkspace(input, delta);
    },
  };
}

export function canAccessFeature(
  input: FeatureGateInput,
  feature: BillingFeatureId,
): FeatureGateResult {
  const lifecycle = checkLifecycle(input);
  if (!lifecycle.allowed) return lifecycle;

  if (planHasFeature(input.planId, feature)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `${getPlanDisplayName(input.planId)} plan does not include ${featureLabel(feature)}. Upgrade to continue.`,
    upgradePlan: findUpgradeForFeature(input.planId, feature),
  };
}

/**
 * Throw when the feature is not available on the current plan / lifecycle.
 */
export function requireFeature(
  input: FeatureGateInput,
  feature: BillingFeatureId,
): void {
  const result = canAccessFeature(input, feature);
  if (!result.allowed) {
    throw new FeatureGateError(result);
  }
}

export function canCreateWebsite(input: FeatureGateInput): FeatureGateResult {
  return canAccessFeature(input, "website_builder");
}

export function canUseAI(input: FeatureGateInput): FeatureGateResult {
  return canAccessFeature(input, "ai_assistant");
}

export function canUseAutomation(input: FeatureGateInput): FeatureGateResult {
  return canAccessFeature(input, "automation");
}

export function canUseMarketplace(input: FeatureGateInput): FeatureGateResult {
  return canAccessFeature(input, "marketplace");
}

export function canCreateAnotherWebsite(
  input: FeatureGateInput,
  delta = 1,
): FeatureGateResult {
  const feature = canCreateWebsite(input);
  if (!feature.allowed) return feature;

  return evaluateMetricGate(input, "sites", delta, "site");
}

export function canUploadMoreMedia(
  input: FeatureGateInput,
  deltaMb = 1,
): FeatureGateResult {
  const lifecycle = checkLifecycle(input);
  if (!lifecycle.allowed) return lifecycle;

  return evaluateMetricGate(input, "storageMb", deltaMb, "MB storage");
}

export function canCreateAnotherWorkspace(
  input: FeatureGateInput,
  delta = 1,
): FeatureGateResult {
  const lifecycle = checkLifecycle(input);
  if (!lifecycle.allowed) return lifecycle;

  const limit = WORKSPACE_QUOTAS[input.planId];
  const current = input.workspaceCount ?? 0;
  const next = current + delta;

  if (isUnlimited(limit) || next <= limit) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `You've reached your ${getPlanDisplayName(input.planId)} plan limit (${formatWorkspaceCap(limit)}). Upgrade to continue.`,
    upgradePlan: findUpgradeForWorkspaceQuota(input.planId, next),
  };
}

export function getWorkspaceQuota(planId: PlanId): number {
  return WORKSPACE_QUOTAS[planId];
}

export class FeatureGateError extends Error {
  readonly result: FeatureGateResult;

  constructor(result: FeatureGateResult) {
    super(result.reason ?? "Feature not available on current plan.");
    this.name = "FeatureGateError";
    this.result = result;
  }
}

function checkLifecycle(input: FeatureGateInput): FeatureGateResult {
  if (!input.subscription) {
    return { allowed: true };
  }

  if (hasLifecycleAccess(input.subscription, input.now ?? new Date())) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Subscription status "${input.subscription.status}" does not grant access. Restore or upgrade your plan to continue.`,
    upgradePlan: input.planId === "free" ? "starter" : suggestPaidPlan(input.planId),
  };
}

function evaluateMetricGate(
  input: FeatureGateInput,
  metric: Extract<UsageMetric, "sites" | "storageMb">,
  delta: number,
  unitLabel: string,
): FeatureGateResult {
  const limits = getPlan(input.planId).limits;
  const current = input.usage?.[metric] ?? 0;
  const evaluation = evaluateUsageLimit({
    planId: input.planId,
    metric,
    limit: limits[metric],
    current,
    delta,
  });

  if (evaluation.allowed) {
    return { allowed: true };
  }

  const next = current + delta;
  const limit = limits[metric];
  const countLabel =
    unitLabel === "MB storage"
      ? `${limit.toLocaleString("en-US")} ${unitLabel}`
      : `${limit.toLocaleString("en-US")} ${unitLabel}${limit === 1 ? "" : "s"}`;
  return {
    allowed: false,
    reason:
      evaluation.message ??
      `You've reached your ${getPlanDisplayName(input.planId)} plan limit (${countLabel}). Upgrade to continue.`,
    upgradePlan: findUpgradeForMetric(input.planId, metric, next),
  };
}

function findUpgradeForFeature(
  currentPlanId: PlanId,
  feature: BillingFeatureId,
): UpgradePlanId | undefined {
  const currentRank = PLAN_RANK[currentPlanId];
  for (const planId of UPGRADE_PLAN_IDS) {
    if (PLAN_RANK[planId] <= currentRank) continue;
    if (planHasFeature(planId, feature)) return planId;
  }
  return undefined;
}

function findUpgradeForMetric(
  currentPlanId: PlanId,
  metric: Extract<UsageMetric, "sites" | "storageMb">,
  required: number,
): UpgradePlanId | undefined {
  const currentRank = PLAN_RANK[currentPlanId];
  for (const planId of UPGRADE_PLAN_IDS) {
    if (PLAN_RANK[planId] <= currentRank) continue;
    const limit = getPlan(planId).limits[metric];
    if (isUnlimited(limit) || limit >= required) return planId;
  }
  return undefined;
}

function findUpgradeForWorkspaceQuota(
  currentPlanId: PlanId,
  required: number,
): UpgradePlanId | undefined {
  const currentRank = PLAN_RANK[currentPlanId];
  for (const planId of UPGRADE_PLAN_IDS) {
    if (PLAN_RANK[planId] <= currentRank) continue;
    const limit = WORKSPACE_QUOTAS[planId];
    if (isUnlimited(limit) || limit >= required) return planId;
  }
  return undefined;
}

function suggestPaidPlan(planId: PlanId): UpgradePlanId | undefined {
  if (planId === "enterprise") return undefined;
  const next = PLAN_IDS.find(
    (id) => id !== "free" && PLAN_RANK[id] > PLAN_RANK[planId],
  );
  return next === "free" || next === undefined ? undefined : next;
}

function formatWorkspaceCap(limit: number): string {
  if (isUnlimited(limit)) return "unlimited workspaces";
  return `${limit.toLocaleString("en-US")} workspace${limit === 1 ? "" : "s"}`;
}

function featureLabel(feature: BillingFeatureId): string {
  switch (feature) {
    case "website_builder":
      return "Website Builder";
    case "crm":
      return "CRM";
    case "ai_assistant":
      return "AI Assistant";
    case "automation":
      return "Automation";
    case "analytics":
      return "Analytics";
    case "knowledge":
      return "Knowledge";
    case "marketplace":
      return "Marketplace";
    case "custom_domains":
      return "custom domains";
    case "priority_support":
      return "priority support";
    case "sso":
      return "SSO";
    case "dedicated_support":
      return "dedicated support";
    case "audit_logs":
      return "audit logs";
    default:
      return feature;
  }
}

/** Convenience: build gate input from an engine subscription + optional usage. */
export function featureGateFromSubscription(
  subscription: Pick<Subscription, "planId" | "status" | "cancelAtPeriodEnd" | "currentPeriodEnd" | "trialEnd" | "gracePeriodEnd">,
  options: {
    usage?: FeatureGateInput["usage"];
    workspaceCount?: number;
    now?: Date;
  } = {},
): FeatureGateService {
  return createFeatureGate({
    planId: subscription.planId,
    subscription,
    usage: options.usage,
    workspaceCount: options.workspaceCount,
    now: options.now,
  });
}
