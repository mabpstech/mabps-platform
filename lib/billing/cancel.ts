import {
  ensureFreeSubscription,
  getSubscriptionByWorkspaceId,
  downgradeToFree,
} from "@/lib/billing/repository";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscriptionFromStripe } from "@/lib/billing/stripe-sync";

export async function cancelWorkspaceSubscription(input: {
  workspaceId: string;
  immediate?: boolean;
}): Promise<void> {
  const subscription = ensureFreeSubscription(input.workspaceId);

  if (!subscription.stripeSubscriptionId || subscription.planId === "free") {
    return;
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

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false },
  );
  syncSubscriptionFromStripe(updated, { workspaceId });
}
