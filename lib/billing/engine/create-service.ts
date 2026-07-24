import {
  preparePlanChange,
  type PreparePlanChangeInput,
} from "@/lib/billing/engine/change-plan";
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
import type { BillingProviderId, Subscription } from "@/lib/billing/engine/types";
import type { BillingInterval, PlanId } from "@/lib/billing/plans";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import type { UsageSnapshot } from "@/lib/billing/types";

function getBillingAppBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
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

      // Checkout initiation only — provider updates, cancel, and webhooks come later.
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

    async cancelSubscription() {
      const providerId = getProviderId();
      if (providerId === "none") {
        throw new Error(
          "No payment provider is configured for cancellation.",
        );
      }
      throw new Error(
        `Cancel via "${providerId}" is not wired in the Billing Engine foundation.`,
      );
    },

    getActiveProvider() {
      return getProviderId();
    },
  };
}

/** Shared domain service instance (no gateway until an adapter registers). */
export const billingService = createBillingService();

export type { BillingInterval, PlanId, Subscription };
