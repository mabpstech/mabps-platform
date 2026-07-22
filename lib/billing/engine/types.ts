import type { BillingInterval, PlanId, PlanLimits } from "@/lib/billing/plans";
import type {
  SubscriptionStatus,
  UsageMetric,
  UsageSnapshot,
  WorkspaceSubscription,
} from "@/lib/billing/types";

/**
 * Payment providers the Billing Engine can adapt to.
 * Concrete adapters are registered later — this foundation stays gateway-agnostic.
 */
export const BILLING_PROVIDERS = [
  "none",
  "stripe",
  "razorpay",
  "paddle",
] as const;
export type BillingProviderId = (typeof BILLING_PROVIDERS)[number];

/**
 * Canonical subscription lifecycle states (provider-independent).
 * Trial → Active → Past Due / Grace Period → Cancelled → Expired.
 */
export const SUBSCRIPTION_LIFECYCLE_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
  "grace_period",
] as const;
export type SubscriptionLifecycleStatus =
  (typeof SUBSCRIPTION_LIFECYCLE_STATUSES)[number];

/**
 * Engine status includes lifecycle states plus provider interim statuses
 * that adapters may surface before normalization.
 */
export type EngineSubscriptionStatus =
  | SubscriptionLifecycleStatus
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

/** Typed product features gated by plan (separate from numeric usage limits). */
export const BILLING_FEATURES = [
  "website_builder",
  "crm",
  "ai_assistant",
  "automation",
  "analytics",
  "knowledge",
  "marketplace",
  "custom_domains",
  "priority_support",
  "sso",
  "dedicated_support",
  "audit_logs",
] as const;
export type BillingFeatureId = (typeof BILLING_FEATURES)[number];

export type FeatureEntitlementMap = Record<BillingFeatureId, boolean>;

/**
 * Provider-agnostic subscription entity.
 * Existing Stripe-specific rows map into this via `toEngineSubscription`.
 */
export type Subscription = {
  id: string;
  workspaceId: string;
  planId: PlanId;
  interval: BillingInterval;
  status: EngineSubscriptionStatus;
  provider: BillingProviderId;
  providerSubscriptionId: string | null;
  providerPriceId: string | null;
  providerCustomerId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  /** When set, paid access continues until this instant during grace. */
  gracePeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UsageLimit = {
  metric: UsageMetric;
  limit: number;
  current: number;
  remaining: number | null;
  unlimited: boolean;
};

export type UsageLimitSnapshot = Record<UsageMetric, UsageLimit>;

export type ResolvedPlan = {
  workspaceId: string;
  planId: PlanId;
  planName: string;
  interval: BillingInterval;
  status: EngineSubscriptionStatus;
  subscription: Subscription;
  limits: PlanLimits;
  features: FeatureEntitlementMap;
  usage: UsageSnapshot;
  usageLimits: UsageLimitSnapshot;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
};

export type PlanChangeKind =
  | "noop"
  | "upgrade"
  | "downgrade"
  | "lateral"
  | "to_free"
  | "from_free";

export type PlanChangePreparation = {
  kind: PlanChangeKind;
  fromPlanId: PlanId;
  toPlanId: PlanId;
  fromInterval: BillingInterval;
  toInterval: BillingInterval;
  requiresCheckout: boolean;
  requiresProviderUpdate: boolean;
  canApplyImmediately: boolean;
  /** Usage metrics that would exceed the target plan limits. */
  blockingMetrics: UsageMetric[];
  message: string;
};

export type TrialConfig = {
  /** Default trial length in days for paid plans. */
  defaultDays: number;
  /** Plans eligible to start a trial. */
  eligiblePlanIds: readonly PlanId[];
};

/** Paid plans suggested when a gate denies access. */
export type UpgradePlanId = Exclude<PlanId, "free">;

/**
 * Structured feature / usage gate result (provider-independent).
 * Used by the Feature Enforcement service — not wired to UI.
 */
export type FeatureGateResult = {
  allowed: boolean;
  reason?: string;
  upgradePlan?: UpgradePlanId;
};

export function isBillingProviderId(
  value: string,
): value is BillingProviderId {
  return (BILLING_PROVIDERS as readonly string[]).includes(value);
}

export function isBillingFeatureId(
  value: string,
): value is BillingFeatureId {
  return (BILLING_FEATURES as readonly string[]).includes(value);
}

export function isSubscriptionLifecycleStatus(
  value: string,
): value is SubscriptionLifecycleStatus {
  return (SUBSCRIPTION_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

/**
 * Map a persisted / provider status into the engine status union.
 */
export function toEngineSubscriptionStatus(
  status: SubscriptionStatus | EngineSubscriptionStatus,
): EngineSubscriptionStatus {
  return status;
}

/**
 * Map the persisted Stripe-shaped subscription into the engine entity.
 * When additional providers land, each adapter maps its own IDs here.
 */
export function toEngineSubscription(
  row: WorkspaceSubscription,
  provider?: BillingProviderId,
): Subscription {
  const resolvedProvider: BillingProviderId =
    provider ??
    ((row.stripeSubscriptionId || row.stripeCustomerId) ? "stripe" : "none");

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    planId: row.planId,
    interval: row.interval,
    status: toEngineSubscriptionStatus(row.status),
    provider: resolvedProvider,
    providerSubscriptionId: row.stripeSubscriptionId,
    providerPriceId: row.stripePriceId,
    providerCustomerId: row.stripeCustomerId,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    canceledAt: row.canceledAt,
    trialStart: null,
    trialEnd: row.trialEnd,
    gracePeriodEnd: null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
