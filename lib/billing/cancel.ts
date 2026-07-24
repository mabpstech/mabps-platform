import { billingService } from "@/lib/billing/engine/create-service";
import { isRazorpayConfigured } from "@/lib/billing/engine/providers";
import {
  ensureFreeSubscription,
  getSubscriptionByWorkspaceId,
  downgradeToFree,
} from "@/lib/billing/repository";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";

export async function cancelWorkspaceSubscription(input: {
  workspaceId: string;
  immediate?: boolean;
}): Promise<void> {
  const subscription = ensureFreeSubscription(input.workspaceId);

  if (!subscription.stripeSubscriptionId || subscription.planId === "free") {
    return;
  }

  // Prefer Billing Engine (Razorpay) when configured.
  if (isRazorpayConfigured()) {
    await billingService.cancelSubscription({
      workspaceId: input.workspaceId,
      immediate: input.immediate,
    });
    return;
  }

  if (!isStripeConfigured()) {
    throw new Error("No payment provider is configured for cancellation.");
  }

  const stripe = getStripe();

  if (input.immediate) {
    const canceled = await stripe.subscriptions.cancel(
      subscription.stripeSubscriptionId,
    );
    syncSubscriptionFromStripe(canceled, {
      workspaceId: input.workspaceId,
    });
    downgradeToFree(input.workspaceId);
    return;
  }

  const updated = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: true },
  );
  syncSubscriptionFromStripe(updated, { workspaceId: input.workspaceId });
}

export async function resumeWorkspaceSubscription(
  workspaceId: string,
): Promise<void> {
  const subscription = getSubscriptionByWorkspaceId(workspaceId);
  if (!subscription?.stripeSubscriptionId || !subscription.cancelAtPeriodEnd) {
    return;
  }

  // Period-end cancel on Razorpay is cleared by starting a new cycle /
  // customer support; resume remains Stripe-hosted for legacy subs.
  if (isRazorpayConfigured() && !isStripeConfigured()) {
    throw new Error(
      "Resume is not available for Razorpay cancellations scheduled at period end. Contact support or wait for the period to end.",
    );
  }

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false },
  );
  syncSubscriptionFromStripe(updated, { workspaceId });
}
