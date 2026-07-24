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
  DEFAULT_GRACE_PERIOD_DAYS,
  activateSubscription,
  cancelSubscription,
  enterGracePeriod,
  expireSubscription,
  getLifecycleStatus,
  hasLifecycleAccess,
  isFeatureAvailable,
  isUsageLimitReached,
  listLifecycleStatuses,
  markPastDue,
  startTrial,
} from "@/lib/billing/engine/lifecycle";
import {
  assertFeatureEntitlement,
  checkFeatureEntitlement,
  getFeatureEntitlements,
  subscriptionHasFeature,
} from "@/lib/billing/engine/entitlements";
import {
  FeatureGateError,
  canAccessFeature,
  canCreateAnotherWebsite,
  canCreateAnotherWorkspace,
  canCreateWebsite,
  canUploadMoreMedia,
  canUseAI,
  canUseAutomation,
  canUseMarketplace,
  createFeatureGate,
  featureGateFromSubscription,
  getWorkspaceQuota,
  requireFeature,
} from "@/lib/billing/engine/feature-gate";
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
  MONTHLY_USAGE_METRICS,
  SUBSCRIPTION_LIFECYCLE_STATUSES,
  USAGE_TRACKING_METRICS,
  isBillingFeatureId,
  isBillingProviderId,
  isSubscriptionLifecycleStatus,
  toEngineSubscription,
  toEngineSubscriptionStatus,
} from "@/lib/billing/engine/types";
import {
  createEmptyUsageCounters,
  createUsageRecord,
  currentUsagePeriodKey,
  decrementUsage,
  getCurrentUsage,
  getPlanLimitForMetric,
  incrementUsage,
  isLimitExceeded,
  isMonthlyUsageMetric,
  isUsageTrackingMetric,
  listMonthlyUsageMetrics,
  listUsageTrackingMetrics,
  resetMonthlyUsage,
} from "@/lib/billing/engine/usage";
import {
  getPaymentProvider,
  listConfiguredPaymentProviders,
  paymentProviderRegistry,
  registerRazorpayPaymentProvider,
  resolveActivePaymentProviderId,
  createPaymentProviderRegistry,
} from "@/lib/billing/engine/providers";
import {
  billingService,
  createBillingService,
} from "@/lib/billing/engine/create-service";
import {
  formatBillingAmount,
  notifyPaymentSuccess,
  notifySubscriptionCancelled,
  notifyTrialEnding,
  processTrialEndingNotifications,
  resolveBillingEmailRecipient,
} from "@/lib/billing/engine/emails";
import {
  processProviderWebhookEvent,
  processRazorpayWebhookEvent,
} from "@/lib/billing/engine/webhooks";

export type {
  BillingFeatureId,
  BillingProviderId,
  EngineSubscriptionStatus,
  FeatureEntitlementMap,
  FeatureGateResult,
  MonthlyUsageMetric,
  PlanChangeKind,
  PlanChangePreparation,
  ResolvedPlan,
  Subscription,
  SubscriptionLifecycleStatus,
  TrialConfig,
  UpgradePlanId,
  UsageLimit,
  UsageLimitExceededResult,
  UsageLimitSnapshot,
  UsageMutationResult,
  UsageRecord,
  UsageTrackingMetric,
  UsageTrackingSnapshot,
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
  FeatureGateInput,
  FeatureGateService,
} from "@/lib/billing/engine/feature-gate";

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

export type {
  LifecycleSubscription,
} from "@/lib/billing/engine/lifecycle";

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
  // Feature Enforcement
  FeatureGateError,
  canAccessFeature,
  canCreateAnotherWebsite,
  canCreateAnotherWorkspace,
  canCreateWebsite,
  canUploadMoreMedia,
  canUseAI,
  canUseAutomation,
  canUseMarketplace,
  createFeatureGate,
  featureGateFromSubscription,
  getWorkspaceQuota,
  requireFeature,
  // Limits
  buildUsageLimit,
  buildUsageLimitSnapshot,
  evaluateUsageLimit,
  findBlockingUsageMetrics,
  isUnlimited,
  listUsageMetrics,
  // Usage Tracking
  MONTHLY_USAGE_METRICS,
  USAGE_TRACKING_METRICS,
  createEmptyUsageCounters,
  createUsageRecord,
  currentUsagePeriodKey,
  decrementUsage,
  getCurrentUsage,
  getPlanLimitForMetric,
  incrementUsage,
  isLimitExceeded,
  isMonthlyUsageMetric,
  isUsageTrackingMetric,
  listMonthlyUsageMetrics,
  listUsageTrackingMetrics,
  resetMonthlyUsage,
  // Resolve
  resolveCurrentPlan,
  resolveFromEngineSubscription,
  resolveFromSubscription,
  resolvePlanId,
  tryResolveCurrentPlan,
  toEngineSubscription,
  toEngineSubscriptionStatus,
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
  // Lifecycle
  SUBSCRIPTION_LIFECYCLE_STATUSES,
  DEFAULT_GRACE_PERIOD_DAYS,
  activateSubscription,
  cancelSubscription,
  enterGracePeriod,
  expireSubscription,
  getLifecycleStatus,
  hasLifecycleAccess,
  isFeatureAvailable,
  isSubscriptionLifecycleStatus,
  isUsageLimitReached,
  listLifecycleStatuses,
  markPastDue,
  startTrial,
  // Providers
  BILLING_PROVIDERS,
  createPaymentProviderRegistry,
  getPaymentProvider,
  isBillingProviderId,
  listConfiguredPaymentProviders,
  paymentProviderRegistry,
  registerRazorpayPaymentProvider,
  resolveActivePaymentProviderId,
  // Service
  billingService,
  createBillingService,
  // Lifecycle emails
  formatBillingAmount,
  notifyPaymentSuccess,
  notifySubscriptionCancelled,
  notifyTrialEnding,
  processTrialEndingNotifications,
  resolveBillingEmailRecipient,
  // Webhooks
  processProviderWebhookEvent,
  processRazorpayWebhookEvent,
};
