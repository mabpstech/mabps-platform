import { billingService } from "@/lib/billing/engine/create-service";
import {
  comparePlans,
  getStripePriceId,
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";
import { cancelWorkspaceSubscription } from "@/lib/billing/cancel";

export async function changeWorkspacePlan(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
}): Promise<{ url?: string; subscriptionId?: string }> {
  if (!isPlanId(input.planId) || !isBillingInterval(input.interval)) {
    throw new Error("Invalid plan or interval.");
  }

  const current = ensureFreeSubscription(input.workspaceId);

  if (input.planId === "free") {
    if (current.planId === "free") {
      return {};
    }
    await cancelWorkspaceSubscription({
      workspaceId: input.workspaceId,
      immediate: false,
    });
    return {};
  }

  // Free → paid (or no provider subscription): Razorpay checkout via Billing Engine
  if (!current.stripeSubscriptionId || current.planId === "free") {
    const result = await billingService.applyPlanChange({
      workspaceId: input.workspaceId,
      workspaceName: input.workspaceName,
      email: input.email,
      targetPlanId: input.planId,
      targetInterval: input.interval,
    });
    if (!result.checkoutUrl) {
      throw new Error("Checkout URL was not returned.");
    }
    return {
      url: result.checkoutUrl,
      subscriptionId: result.subscriptionId,
    };
  }

  const priceId = getStripePriceId(input.planId, input.interval);
  if (!priceId) {
    throw new Error(
      `Stripe price is not configured for ${input.planId} (${input.interval}).`,
    );
  }

  // Same plan + interval: no-op
  if (
    current.planId === input.planId &&
    current.interval === input.interval &&
    !current.cancelAtPeriodEnd
  ) {
    return { subscriptionId: current.stripeSubscriptionId };
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(
    current.stripeSubscriptionId,
  );
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Stripe subscription has no items to update.");
  }

  const isUpgrade = comparePlans(input.planId, current.planId) > 0;
  const updated = await stripe.subscriptions.update(subscription.id, {
    cancel_at_period_end: false,
    proration_behavior: isUpgrade ? "create_prorations" : "create_prorations",
    items: [
      {
        id: itemId,
        price: priceId,
      },
    ],
    metadata: {
      workspaceId: input.workspaceId,
      planId: input.planId,
      interval: input.interval,
    },
  });

  syncSubscriptionFromStripe(updated, { workspaceId: input.workspaceId });
  return { subscriptionId: updated.id };
}
