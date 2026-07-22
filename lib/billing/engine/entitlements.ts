import {
  getPlanDisplayName,
  getPlanFeatures,
  planHasFeature,
} from "@/lib/billing/engine/plans";
import type {
  BillingFeatureId,
  FeatureEntitlementMap,
  Subscription,
} from "@/lib/billing/engine/types";
import type { PlanId } from "@/lib/billing/plans";

export type FeatureCheckResult = {
  allowed: boolean;
  planId: PlanId;
  feature: BillingFeatureId;
  message?: string;
};

/**
 * Feature entitlement model — boolean gates distinct from numeric usage limits.
 */
export function getFeatureEntitlements(
  planId: PlanId,
): FeatureEntitlementMap {
  return getPlanFeatures(planId);
}

export function checkFeatureEntitlement(
  planId: PlanId,
  feature: BillingFeatureId,
): FeatureCheckResult {
  const allowed = planHasFeature(planId, feature);
  return {
    allowed,
    planId,
    feature,
    message: allowed
      ? undefined
      : `${getPlanDisplayName(planId)} plan does not include ${featureLabel(feature)}. Upgrade to continue.`,
  };
}

export function assertFeatureEntitlement(
  planId: PlanId,
  feature: BillingFeatureId,
): void {
  const result = checkFeatureEntitlement(planId, feature);
  if (!result.allowed) {
    throw new Error(result.message ?? "Feature not available on current plan.");
  }
}

export function subscriptionHasFeature(
  subscription: Pick<Subscription, "planId">,
  feature: BillingFeatureId,
): boolean {
  return planHasFeature(subscription.planId, feature);
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
