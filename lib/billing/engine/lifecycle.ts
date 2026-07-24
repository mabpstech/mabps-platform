import { planHasFeature, getPlan } from "@/lib/billing/engine/plans";
import { isUnlimited } from "@/lib/billing/engine/limits";
import {
  buildTrialFields,
  DEFAULT_TRIAL_CONFIG,
} from "@/lib/billing/engine/trial";
import {
  isSubscriptionLifecycleStatus,
  SUBSCRIPTION_LIFECYCLE_STATUSES,
  type BillingFeatureId,
  type Subscription,
  type SubscriptionLifecycleStatus,
} from "@/lib/billing/engine/types";
import type { PlanId } from "@/lib/billing/plans";
import type { UsageMetric, UsageSnapshot } from "@/lib/billing/types";

/** Default soft-access window after payment failure or pre-expiry. */
export const DEFAULT_GRACE_PERIOD_DAYS = 3;

export type LifecycleSubscription = Pick<
  Subscription,
  | "planId"
  | "status"
  | "cancelAtPeriodEnd"
  | "currentPeriodEnd"
  | "trialEnd"
  | "gracePeriodEnd"
>;

/**
 * Normalize engine status into a canonical lifecycle state when possible.
 * Provider interim statuses (incomplete, unpaid, …) return null.
 */
export function getLifecycleStatus(
  subscription: Pick<Subscription, "status">,
): SubscriptionLifecycleStatus | null {
  return isSubscriptionLifecycleStatus(subscription.status)
    ? subscription.status
    : null;
}

export function listLifecycleStatuses(): readonly SubscriptionLifecycleStatus[] {
  return SUBSCRIPTION_LIFECYCLE_STATUSES;
}

/**
 * Whether the subscription currently grants paid-plan product access.
 * Free plans always pass through (feature matrix still applies).
 */
export function hasLifecycleAccess(
  subscription: LifecycleSubscription,
  now = new Date(),
): boolean {
  if (subscription.planId === "free") {
    return true;
  }

  const status = subscription.status;
  const nowMs = now.getTime();

  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
      return true;
    case "grace_period":
      if (!subscription.gracePeriodEnd) return true;
      return new Date(subscription.gracePeriodEnd).getTime() > nowMs;
    case "canceled":
      if (
        subscription.cancelAtPeriodEnd &&
        subscription.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd).getTime() > nowMs
      ) {
        return true;
      }
      return false;
    case "expired":
      return false;
    default:
      // incomplete / unpaid / paused — deny until lifecycle-normalized
      return false;
  }
}

function touch(
  subscription: Subscription,
  patch: Partial<Subscription>,
  now: Date,
): Subscription {
  return {
    ...subscription,
    ...patch,
    updatedAt: now.toISOString(),
  };
}

/**
 * Start a trial on a subscription (domain transition only — no provider I/O).
 */
export function startTrial(
  subscription: Subscription,
  input: {
    planId: PlanId;
    days?: number;
    now?: Date;
  },
): Subscription {
  const now = input.now ?? new Date();
  const lifecycle = getLifecycleStatus(subscription);

  if (
    lifecycle === "active" ||
    lifecycle === "trialing" ||
    lifecycle === "past_due" ||
    lifecycle === "grace_period"
  ) {
    throw new Error(
      `Cannot start a trial while subscription is "${subscription.status}".`,
    );
  }

  const trial = buildTrialFields({
    planId: input.planId,
    start: now,
    days: input.days ?? DEFAULT_TRIAL_CONFIG.defaultDays,
  });
  if (!trial) {
    throw new Error(`Plan "${input.planId}" is not eligible for a trial.`);
  }

  return touch(
    subscription,
    {
      planId: input.planId,
      status: trial.status,
      trialStart: trial.trialStart,
      trialEnd: trial.trialEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriodEnd: null,
      currentPeriodStart: trial.trialStart,
      currentPeriodEnd: trial.trialEnd,
    },
    now,
  );
}

/**
 * Activate a paid subscription (trial conversion, recovery from past due / grace).
 */
export function activateSubscription(
  subscription: Subscription,
  input: {
    planId?: PlanId;
    now?: Date;
    periodEnd?: string | null;
  } = {},
): Subscription {
  const now = input.now ?? new Date();
  const lifecycle = getLifecycleStatus(subscription);
  const planId = input.planId ?? subscription.planId;

  if (planId === "free") {
    throw new Error("Cannot activate the Free plan as a paid subscription.");
  }

  if (lifecycle === "expired") {
    throw new Error(
      "Expired subscriptions must start a new trial or checkout before activation.",
    );
  }

  if (
    lifecycle !== "trialing" &&
    lifecycle !== "active" &&
    lifecycle !== "past_due" &&
    lifecycle !== "grace_period" &&
    lifecycle !== "canceled" &&
    lifecycle !== null
  ) {
    throw new Error(
      `Cannot activate subscription from status "${subscription.status}".`,
    );
  }

  return touch(
    subscription,
    {
      planId,
      status: "active",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      gracePeriodEnd: null,
      trialEnd:
        subscription.status === "trialing"
          ? now.toISOString()
          : subscription.trialEnd,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd:
        input.periodEnd !== undefined
          ? input.periodEnd
          : subscription.currentPeriodEnd,
    },
    now,
  );
}

/**
 * Cancel a subscription immediately or at period end.
 */
export function cancelSubscription(
  subscription: Subscription,
  input: {
    immediate?: boolean;
    now?: Date;
  } = {},
): Subscription {
  const now = input.now ?? new Date();
  const lifecycle = getLifecycleStatus(subscription);

  if (lifecycle === "canceled" && subscription.cancelAtPeriodEnd === false) {
    return subscription;
  }

  if (lifecycle === "expired") {
    throw new Error("Cannot cancel an already expired subscription.");
  }

  if (input.immediate) {
    return touch(
      subscription,
      {
        status: "canceled",
        cancelAtPeriodEnd: false,
        canceledAt: now.toISOString(),
        gracePeriodEnd: null,
        currentPeriodEnd: now.toISOString(),
      },
      now,
    );
  }

  return touch(
    subscription,
    {
      status: lifecycle === "trialing" ? "canceled" : subscription.status,
      cancelAtPeriodEnd: true,
      canceledAt: now.toISOString(),
    },
    now,
  );
}

/**
 * Mark a subscription as expired (trial ended, cancel period ended, grace elapsed).
 */
export function expireSubscription(
  subscription: Subscription,
  input: { now?: Date } = {},
): Subscription {
  const now = input.now ?? new Date();

  return touch(
    subscription,
    {
      status: "expired",
      cancelAtPeriodEnd: false,
      canceledAt: subscription.canceledAt ?? now.toISOString(),
      gracePeriodEnd: null,
      currentPeriodEnd: now.toISOString(),
    },
    now,
  );
}

/**
 * Enter a grace period (soft access while payment recovers or before expiry).
 */
export function enterGracePeriod(
  subscription: Subscription,
  input: {
    days?: number;
    now?: Date;
    endsAt?: string;
  } = {},
): Subscription {
  const now = input.now ?? new Date();
  const lifecycle = getLifecycleStatus(subscription);

  if (lifecycle === "expired") {
    throw new Error("Cannot enter grace period from an expired subscription.");
  }

  if (lifecycle === "canceled" && !subscription.cancelAtPeriodEnd) {
    throw new Error(
      "Immediately canceled subscriptions cannot enter a grace period.",
    );
  }

  const days = input.days ?? DEFAULT_GRACE_PERIOD_DAYS;
  const gracePeriodEnd =
    input.endsAt ??
    (() => {
      const end = new Date(now.getTime());
      end.setUTCDate(end.getUTCDate() + days);
      return end.toISOString();
    })();

  return touch(
    subscription,
    {
      status: "grace_period",
      gracePeriodEnd,
    },
    now,
  );
}

/**
 * Feature gate: plan entitlement + lifecycle access.
 */
export function isFeatureAvailable(
  subscription: LifecycleSubscription & Pick<Subscription, "planId">,
  feature: BillingFeatureId,
  now = new Date(),
): boolean {
  if (!hasLifecycleAccess(subscription, now)) {
    return false;
  }
  return planHasFeature(subscription.planId, feature);
}

/**
 * Usage gate: true when current usage is at or above the plan limit.
 */
export function isUsageLimitReached(
  subscription: Pick<Subscription, "planId">,
  metric: UsageMetric,
  usage: UsageSnapshot | number,
): boolean {
  const limit = getPlan(subscription.planId).limits[metric];
  if (isUnlimited(limit)) {
    return false;
  }
  const current = typeof usage === "number" ? usage : usage[metric];
  return current >= limit;
}

/**
 * Mark payment as past due (supported lifecycle state; no provider I/O).
 * Preserves an existing grace window; establishes the default grace period
 * when none is set so soft access continues after payment failure.
 */
export function markPastDue(
  subscription: Subscription,
  input: { now?: Date; graceDays?: number } = {},
): Subscription {
  const now = input.now ?? new Date();
  const lifecycle = getLifecycleStatus(subscription);

  if (
    lifecycle !== "active" &&
    lifecycle !== "trialing" &&
    lifecycle !== "past_due" &&
    lifecycle !== "grace_period"
  ) {
    throw new Error(
      `Cannot mark subscription past due from status "${subscription.status}".`,
    );
  }

  const gracePeriodEnd =
    subscription.gracePeriodEnd ??
    (() => {
      const days = input.graceDays ?? DEFAULT_GRACE_PERIOD_DAYS;
      const end = new Date(now.getTime());
      end.setUTCDate(end.getUTCDate() + days);
      return end.toISOString();
    })();

  return touch(
    subscription,
    {
      status: "past_due",
      gracePeriodEnd,
    },
    now,
  );
}
