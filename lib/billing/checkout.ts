import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import {
  getStripePriceId,
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import { getAppBaseUrl, getStripe } from "@/lib/billing/stripe";

export async function createCheckoutSession(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
}): Promise<{ url: string }> {
  if (!isPlanId(input.planId) || input.planId === "free") {
    throw new Error("Select a paid plan to start checkout.");
  }
  if (!isBillingInterval(input.interval)) {
    throw new Error("Invalid billing interval.");
  }

  const priceId = getStripePriceId(input.planId, input.interval);
  if (!priceId) {
    throw new Error(
      `Stripe price is not configured for ${input.planId} (${input.interval}).`,
    );
  }

  ensureFreeSubscription(input.workspaceId);

  const customerId = await getOrCreateStripeCustomer({
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    email: input.email,
  });

  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: input.workspaceId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings/workspace/billing?checkout=success`,
    cancel_url: `${baseUrl}/settings/workspace/billing?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    metadata: {
      workspaceId: input.workspaceId,
      planId: input.planId,
      interval: input.interval,
    },
    subscription_data: {
      metadata: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        interval: input.interval,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { url: session.url };
}
