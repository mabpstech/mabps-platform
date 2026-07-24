import {
  activateSubscription,
  cancelSubscription,
} from "@/lib/billing/engine/lifecycle";
import type { ProviderWebhookEvent } from "@/lib/billing/engine/providers/types";
import {
  toEngineSubscription,
  type EngineSubscriptionStatus,
  type Subscription,
} from "@/lib/billing/engine/types";
import { isBillingInterval, isPlanId, type PlanId } from "@/lib/billing/plans";
import {
  downgradeToFree,
  ensureFreeSubscription,
  getSubscriptionByStripeId,
  getSubscriptionByWorkspaceId,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  upsertSubscription,
} from "@/lib/billing/repository";
import type { SubscriptionStatus } from "@/lib/billing/types";

function toPersistedStatus(
  status: EngineSubscriptionStatus,
): SubscriptionStatus {
  switch (status) {
    case "grace_period":
      return "past_due";
    case "expired":
      return "canceled";
    default:
      return status;
  }
}

function persistEngineSubscription(subscription: Subscription): void {
  upsertSubscription({
    workspaceId: subscription.workspaceId,
    planId: subscription.planId,
    interval: subscription.interval,
    status: toPersistedStatus(subscription.status),
    stripeSubscriptionId: subscription.providerSubscriptionId,
    stripePriceId: subscription.providerPriceId,
    stripeCustomerId: subscription.providerCustomerId,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    trialEnd: subscription.trialEnd,
  });
}

function resolveWorkspaceId(input: {
  workspaceId?: string;
  providerSubscriptionId?: string;
}): string | null {
  if (input.workspaceId) {
    return input.workspaceId;
  }
  if (input.providerSubscriptionId) {
    return (
      getSubscriptionByStripeId(input.providerSubscriptionId)?.workspaceId ??
      null
    );
  }
  return null;
}

function loadEngineSubscription(
  workspaceId: string,
  provider: "razorpay" = "razorpay",
): Subscription {
  const row =
    getSubscriptionByWorkspaceId(workspaceId) ??
    ensureFreeSubscription(workspaceId);
  return toEngineSubscription(row, provider);
}

/**
 * Apply a normalized provider webhook event to the Billing Engine lifecycle
 * and persist the resulting subscription row.
 */
export function processProviderWebhookEvent(
  event: ProviderWebhookEvent,
): { ok: true; skipped?: boolean; reason?: string } {
  switch (event.type) {
    case "subscription.updated": {
      const workspaceId = resolveWorkspaceId({
        workspaceId: event.subscription.workspaceId,
        providerSubscriptionId: event.subscription.providerSubscriptionId,
      });
      if (!workspaceId) {
        console.warn(
          `[billing] Unable to resolve workspace for provider subscription ${event.subscription.providerSubscriptionId}`,
        );
        return { ok: true, skipped: true, reason: "missing_workspace" };
      }

      const current = loadEngineSubscription(workspaceId);
      const planId: PlanId | undefined =
        event.subscription.planId && isPlanId(event.subscription.planId)
          ? event.subscription.planId
          : current.planId !== "free"
            ? current.planId
            : undefined;

      if (!planId || planId === "free") {
        console.warn(
          `[billing] Razorpay subscription.updated missing paid plan for workspace ${workspaceId}`,
        );
        return { ok: true, skipped: true, reason: "missing_plan" };
      }

      const interval =
        event.subscription.interval &&
        isBillingInterval(event.subscription.interval)
          ? event.subscription.interval
          : current.interval;

      const activated = activateSubscription(
        {
          ...current,
          provider: "razorpay",
          providerSubscriptionId:
            event.subscription.providerSubscriptionId ??
            current.providerSubscriptionId,
          providerCustomerId:
            event.subscription.providerCustomerId !== undefined
              ? event.subscription.providerCustomerId
              : current.providerCustomerId,
          providerPriceId:
            event.subscription.providerPriceId !== undefined
              ? event.subscription.providerPriceId
              : current.providerPriceId,
          interval,
        },
        {
          planId,
          periodEnd:
            event.subscription.currentPeriodEnd !== undefined
              ? event.subscription.currentPeriodEnd
              : current.currentPeriodEnd,
        },
      );

      persistEngineSubscription({
        ...activated,
        currentPeriodStart:
          event.subscription.currentPeriodStart ??
          activated.currentPeriodStart,
        currentPeriodEnd:
          event.subscription.currentPeriodEnd ?? activated.currentPeriodEnd,
      });
      return { ok: true };
    }

    case "subscription.deleted": {
      const workspaceId = resolveWorkspaceId({
        workspaceId: event.workspaceId,
        providerSubscriptionId: event.providerSubscriptionId,
      });
      if (!workspaceId) {
        console.warn(
          `[billing] Unable to resolve workspace for cancelled provider subscription ${event.providerSubscriptionId}`,
        );
        return { ok: true, skipped: true, reason: "missing_workspace" };
      }

      const current = loadEngineSubscription(workspaceId);
      // Domain transition: immediate cancel, then align persisted access with Free
      // (same product outcome as the Stripe cancelled path).
      cancelSubscription(current, { immediate: true });
      downgradeToFree(workspaceId);
      return { ok: true };
    }

    case "invoice.paid": {
      const workspaceId = resolveWorkspaceId({
        workspaceId: event.workspaceId,
      });
      if (!workspaceId) {
        return { ok: true, skipped: true, reason: "missing_workspace" };
      }

      const current = loadEngineSubscription(workspaceId);
      if (current.planId === "free") {
        return { ok: true, skipped: true, reason: "free_plan" };
      }

      const activated = activateSubscription(current);
      persistEngineSubscription(activated);
      return { ok: true };
    }

    case "invoice.payment_failed":
    case "checkout.completed":
    case "unhandled":
      return { ok: true, skipped: true, reason: event.type };

    default:
      return { ok: true, skipped: true, reason: "unknown" };
  }
}

/**
 * Idempotent Razorpay → Billing Engine webhook processing.
 */
export function processRazorpayWebhookEvent(input: {
  eventId: string;
  eventType: string;
  event: ProviderWebhookEvent;
}): { ok: true; duplicate?: boolean; skipped?: boolean; reason?: string } {
  if (hasProcessedWebhookEvent(input.eventId)) {
    return { ok: true, duplicate: true };
  }

  const result = processProviderWebhookEvent(input.event);
  markWebhookEventProcessed(input.eventId, input.eventType);
  return result;
}
