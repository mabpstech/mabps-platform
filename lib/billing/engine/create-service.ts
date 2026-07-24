import {
  preparePlanChange,
  type PreparePlanChangeInput,
} from "@/lib/billing/engine/change-plan";
import {
  notifySubscriptionCancelled,
} from "@/lib/billing/engine/emails";
import {
  cancelSubscription as applyCancelLifecycle,
} from "@/lib/billing/engine/lifecycle";
import {
  resolveActivePaymentProviderId,
  getPaymentProvider,
} from "@/lib/billing/engine/providers";
import {
  resolveCurrentPlan,
} from "@/lib/billing/engine/resolve";
import type {
  BillingPlanChangeResult,
  BillingService,
  BillingServiceContext,
} from "@/lib/billing/engine/service";
import { buildTrialFields } from "@/lib/billing/engine/trial";
import {
  toEngineSubscription,
  type BillingProviderId,
  type Subscription,
} from "@/lib/billing/engine/types";
import type { BillingInterval, PlanId } from "@/lib/billing/plans";
import {
  downgradeToFree,
  ensureFreeSubscription,
  getSubscriptionByWorkspaceId,
  upsertSubscription,
} from "@/lib/billing/repository";
import type { SubscriptionStatus } from "@/lib/billing/types";
import type { UsageSnapshot } from "@/lib/billing/types";

function getBillingAppBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function toPersistedStatus(
  status: Subscription["status"],
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

/**
 * Domain-only BillingService.
 * Resolves plans and prepares changes; payment methods require a registered adapter.
 */
export function createBillingService(
  context: BillingServiceContext = { providerId: "none" },
): BillingService {
  const getProviderId = (): BillingProviderId => {
    if (context.providerId !== "none") {
      return resolveActivePaymentProviderId(context.providerId);
    }
    return resolveActivePaymentProviderId();
  };

  return {
    resolveCurrentPlan(workspaceId) {
      return resolveCurrentPlan(workspaceId);
    },

    preparePlanChange(input) {
      const resolved = resolveCurrentPlan(input.workspaceId);
      const usage: UsageSnapshot = input.usage ?? resolved.usage;
      const prepInput: PreparePlanChangeInput = {
        subscription: resolved.subscription,
        targetPlanId: input.targetPlanId,
        targetInterval: input.targetInterval,
        usage,
      };
      return preparePlanChange(prepInput);
    },

    async applyPlanChange(input) {
      const resolved = resolveCurrentPlan(input.workspaceId);
      const preparation = preparePlanChange({
        subscription: resolved.subscription,
        targetPlanId: input.targetPlanId,
        targetInterval: input.targetInterval,
        usage: resolved.usage,
      });

      if (preparation.kind === "noop") {
        return {
          preparation,
          subscriptionId:
            resolved.subscription.providerSubscriptionId ?? undefined,
        };
      }

      if (preparation.blockingMetrics.length > 0) {
        throw new Error(preparation.message);
      }

      const providerId = getProviderId();
      if (providerId === "none") {
        throw new Error(
          "No payment provider is configured. Register a Stripe, Razorpay, or Paddle adapter before applying plan changes.",
        );
      }

      const adapter = getPaymentProvider(providerId);
      if (!adapter?.isConfigured()) {
        throw new Error(
          `Payment provider "${providerId}" is not configured.`,
        );
      }

      // Checkout initiation for Free → paid; in-plan updates stay provider-specific.
      if (preparation.requiresCheckout) {
        const baseUrl = getBillingAppBaseUrl();
        const checkout = await adapter.createCheckout({
          workspaceId: input.workspaceId,
          workspaceName: input.workspaceName,
          email: input.email,
          planId: input.targetPlanId,
          interval: input.targetInterval,
          successUrl: `${baseUrl}/settings/workspace/billing?checkout=success`,
          cancelUrl: `${baseUrl}/settings/workspace/billing?checkout=canceled`,
          customerId:
            resolved.subscription.providerCustomerId ?? undefined,
        });

        return {
          preparation,
          checkoutUrl: checkout.url,
          subscriptionId: checkout.sessionId,
        };
      }

      throw new Error(
        `Plan change "${preparation.kind}" via "${providerId}" requires a provider update that is not wired yet.`,
      );
    },

    async startTrial(input) {
      ensureFreeSubscription(input.workspaceId);
      const trial = buildTrialFields({
        planId: input.planId,
        days: input.days,
      });
      if (!trial) {
        throw new Error(
          `Plan "${input.planId}" is not eligible for a trial.`,
        );
      }

      // Persist path stays with repository + provider adapters in a later commit.
      void trial;
      throw new Error(
        "Trial start requires a payment provider adapter. Domain trial helpers are available via buildTrialFields.",
      );
    },

    async cancelSubscription(input) {
      const providerId = getProviderId();
      if (providerId === "none") {
        throw new Error(
          "No payment provider is configured for cancellation.",
        );
      }

      const adapter = getPaymentProvider(providerId);
      if (!adapter?.isConfigured()) {
        throw new Error(
          `Payment provider "${providerId}" is not configured.`,
        );
      }

      const row =
        getSubscriptionByWorkspaceId(input.workspaceId) ??
        ensureFreeSubscription(input.workspaceId);

      if (row.planId === "free" || !row.stripeSubscriptionId) {
        return;
      }

      const current = toEngineSubscription(row, providerId);
      await adapter.cancelSubscription({
        workspaceId: input.workspaceId,
        providerSubscriptionId: row.stripeSubscriptionId,
        immediate: Boolean(input.immediate),
      });

      const next = applyCancelLifecycle(current, {
        immediate: Boolean(input.immediate),
      });

      const endsAt = input.immediate
        ? next.canceledAt ?? new Date().toISOString()
        : next.currentPeriodEnd ?? next.canceledAt;

      await notifySubscriptionCancelled({
        workspaceId: input.workspaceId,
        planId: current.planId,
        endsAt,
        providerSubscriptionId: row.stripeSubscriptionId,
      });

      if (input.immediate) {
        downgradeToFree(input.workspaceId);
        return;
      }

      persistEngineSubscription(next);
    },

    async createPortalSession(input) {
      const providerId = getProviderId();
      if (providerId === "none") {
        throw new Error(
          "No payment provider is configured for the billing portal.",
        );
      }

      const adapter = getPaymentProvider(providerId);
      if (!adapter?.isConfigured()) {
        throw new Error(
          `Payment provider "${providerId}" is not configured.`,
        );
      }

      return adapter.createPortal({
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        returnUrl: input.returnUrl,
      });
    },

    async listInvoices(input) {
      const providerId = getProviderId();
      if (providerId === "none") {
        return [];
      }

      const adapter = getPaymentProvider(providerId);
      if (!adapter?.isConfigured()) {
        return [];
      }

      return adapter.listInvoices({
        workspaceId: input.workspaceId,
        customerId: input.customerId,
        limit: input.limit,
      });
    },

    getActiveProvider() {
      return getProviderId();
    },
  };
}

/** Shared domain service instance (no gateway until an adapter registers). */
export const billingService = createBillingService();

export type { BillingInterval, PlanId, Subscription };
