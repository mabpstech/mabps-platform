import {
  DEFAULT_TRIAL_CONFIG,
  buildTrialFields,
  computeTrialEnd,
  getTrialDaysRemaining,
  hasActiveTrialAccess,
  isPlanTrialEligible,
  isSubscriptionTrialing,
} from "@/lib/billing/engine/trial";
import {
  assertFeatureEntitlement,
  checkFeatureEntitlement,
  getFeatureEntitlements,
  subscriptionHasFeature,
} from "@/lib/billing/engine/entitlements";
import {
  buildUsageLimit,
  buildUsageLimitSnapshot,
  evaluateUsageLimit,
  findBlockingUsageMetrics,
  isUnlimited,
  listUsageMetrics,
} from "@/lib/billing/engine/limits";
import {
  PLAN_DISPLAY_NAMES,
  PLAN_FEATURE_ENTITLEMENTS,
  PLAN_IDS,
  PLAN_RANK,
  PLANS,
  comparePlans,
  getEnginePlan,
  getPlan,
  getPlanDisplayName,
  getPlanFeatures,
  isBillingInterval,
  isPlanId,
  listEnabledFeatures,
  listEnginePlans,
  planHasFeature,
} from "@/lib/billing/engine/plans";
import {
  prepareDowngrade,
  preparePlanChange,
  prepareUpgrade,
} from "@/lib/billing/engine/change-plan";
import {
  resolveCurrentPlan,
  resolveFromEngineSubscription,
  resolveFromSubscription,
  resolvePlanId,
  tryResolveCurrentPlan,
} from "@/lib/billing/engine/resolve";
import {
  BILLING_FEATURES,
  BILLING_PROVIDERS,
  isBillingFeatureId,
  isBillingProviderId,
  toEngineSubscription,
} from "@/lib/billing/engine/types";
import {
  getPaymentProvider,
  listConfiguredPaymentProviders,
  paymentProviderRegistry,
  resolveActivePaymentProviderId,
  createPaymentProviderRegistry,
} from "@/lib/billing/engine/providers";
import {
  billingService,
  createBillingService,
} from "@/lib/billing/engine/create-service";

export type {
  BillingFeatureId,
  BillingProviderId,
  FeatureEntitlementMap,
  PlanChangeKind,
  PlanChangePreparation,
  ResolvedPlan,
  Subscription,
  TrialConfig,
  UsageLimit,
  UsageLimitSnapshot,
} from "@/lib/billing/engine/types";

export type {
  BillingInterval,
  EnginePlanDefinition,
  PlanDefinition,
  PlanId,
  PlanLimits,
} from "@/lib/billing/engine/plans";

export type {
  FeatureCheckResult,
} from "@/lib/billing/engine/entitlements";

export type {
  LimitEvaluation,
} from "@/lib/billing/engine/limits";

export type {
  PreparePlanChangeInput,
} from "@/lib/billing/engine/change-plan";

export type {
  BillingPlanChangeResult,
  BillingService,
  BillingServiceContext,
} from "@/lib/billing/engine/service";

export type {
  PaymentProviderAdapter,
  PaymentProviderRegistry,
  ProviderCancelInput,
  ProviderChangeSubscriptionInput,
  ProviderCheckoutInput,
  ProviderPortalInput,
  ProviderWebhookEvent,
} from "@/lib/billing/engine/providers";

export {
  // Plans
  PLAN_DISPLAY_NAMES,
  PLAN_FEATURE_ENTITLEMENTS,
  PLAN_IDS,
  PLAN_RANK,
  PLANS,
  comparePlans,
  getEnginePlan,
  getPlan,
  getPlanDisplayName,
  getPlanFeatures,
  isBillingInterval,
  isPlanId,
  listEnabledFeatures,
  listEnginePlans,
  planHasFeature,
  // Features
  BILLING_FEATURES,
  assertFeatureEntitlement,
  checkFeatureEntitlement,
  getFeatureEntitlements,
  isBillingFeatureId,
  subscriptionHasFeature,
  // Limits
  buildUsageLimit,
  buildUsageLimitSnapshot,
  evaluateUsageLimit,
  findBlockingUsageMetrics,
  isUnlimited,
  listUsageMetrics,
  // Resolve
  resolveCurrentPlan,
  resolveFromEngineSubscription,
  resolveFromSubscription,
  resolvePlanId,
  tryResolveCurrentPlan,
  toEngineSubscription,
  // Change plan
  prepareDowngrade,
  preparePlanChange,
  prepareUpgrade,
  // Trial
  DEFAULT_TRIAL_CONFIG,
  buildTrialFields,
  computeTrialEnd,
  getTrialDaysRemaining,
  hasActiveTrialAccess,
  isPlanTrialEligible,
  isSubscriptionTrialing,
  // Providers
  BILLING_PROVIDERS,
  createPaymentProviderRegistry,
  getPaymentProvider,
  isBillingProviderId,
  listConfiguredPaymentProviders,
  paymentProviderRegistry,
  resolveActivePaymentProviderId,
  // Service
  billingService,
  createBillingService,
};
