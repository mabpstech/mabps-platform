import {
  PLAN_IDS,
  PLAN_RANK,
  PLANS,
  comparePlans,
  getPlan,
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanDefinition,
  type PlanId,
  type PlanLimits,
} from "@/lib/billing/plans";
import {
  BILLING_FEATURES,
  type BillingFeatureId,
  type FeatureEntitlementMap,
} from "@/lib/billing/engine/types";

/**
 * Feature matrix for Free / Starter / Professional (`pro`) / Enterprise.
 * Numeric quotas remain on `PlanDefinition.limits` in `@/lib/billing/plans`.
 */
export const PLAN_FEATURE_ENTITLEMENTS: Record<
  PlanId,
  FeatureEntitlementMap
> = {
  free: {
    website_builder: true,
    crm: true,
    ai_assistant: true,
    automation: false,
    analytics: true,
    knowledge: true,
    marketplace: true,
    custom_domains: false,
    priority_support: false,
    sso: false,
    dedicated_support: false,
    audit_logs: false,
  },
  starter: {
    website_builder: true,
    crm: true,
    ai_assistant: true,
    automation: true,
    analytics: true,
    knowledge: true,
    marketplace: true,
    custom_domains: true,
    priority_support: false,
    sso: false,
    dedicated_support: false,
    audit_logs: false,
  },
  pro: {
    website_builder: true,
    crm: true,
    ai_assistant: true,
    automation: true,
    analytics: true,
    knowledge: true,
    marketplace: true,
    custom_domains: true,
    priority_support: true,
    sso: false,
    dedicated_support: false,
    audit_logs: true,
  },
  enterprise: {
    website_builder: true,
    crm: true,
    ai_assistant: true,
    automation: true,
    analytics: true,
    knowledge: true,
    marketplace: true,
    custom_domains: true,
    priority_support: true,
    sso: true,
    dedicated_support: true,
    audit_logs: true,
  },
};

/** Canonical display names (Professional is the product name for `pro`). */
export const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Professional",
  enterprise: "Enterprise",
};

export function getPlanFeatures(planId: PlanId): FeatureEntitlementMap {
  return PLAN_FEATURE_ENTITLEMENTS[planId];
}

export function getPlanDisplayName(planId: PlanId): string {
  return PLAN_DISPLAY_NAMES[planId];
}

export function listEnabledFeatures(planId: PlanId): BillingFeatureId[] {
  const map = getPlanFeatures(planId);
  return BILLING_FEATURES.filter((feature) => map[feature]);
}

export function planHasFeature(
  planId: PlanId,
  feature: BillingFeatureId,
): boolean {
  return getPlanFeatures(planId)[feature];
}

export type EnginePlanDefinition = PlanDefinition & {
  displayName: string;
  featureEntitlements: FeatureEntitlementMap;
};

export function getEnginePlan(planId: PlanId): EnginePlanDefinition {
  const plan = getPlan(planId);
  return {
    ...plan,
    name: PLAN_DISPLAY_NAMES[planId],
    displayName: PLAN_DISPLAY_NAMES[planId],
    featureEntitlements: getPlanFeatures(planId),
  };
}

export function listEnginePlans(): EnginePlanDefinition[] {
  return PLAN_IDS.map(getEnginePlan);
}

export {
  PLAN_IDS,
  PLAN_RANK,
  PLANS,
  comparePlans,
  getPlan,
  isBillingInterval,
  isPlanId,
};
export type { BillingInterval, PlanDefinition, PlanId, PlanLimits };
