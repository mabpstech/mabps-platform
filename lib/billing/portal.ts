import { billingService } from "@/lib/billing/engine/create-service";
import { isRazorpayConfigured } from "@/lib/billing/engine/providers";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import {
  ensureFreeSubscription,
  getBillingCustomerByWorkspaceId,
} from "@/lib/billing/repository";
import { getAppBaseUrl, getStripe, isStripeConfigured } from "@/lib/billing/stripe";

export async function createBillingPortalSession(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
}): Promise<{ url: string }> {
  const baseUrl = getAppBaseUrl();
  const returnUrl = `${baseUrl}/settings/workspace/billing`;

  // In-app Customer Billing Portal via Billing Engine (Razorpay path).
  if (isRazorpayConfigured()) {
    const subscription = ensureFreeSubscription(input.workspaceId);
    const customer =
      getBillingCustomerByWorkspaceId(input.workspaceId)?.stripeCustomerId ??
      subscription.stripeCustomerId;

    if (!customer) {
      // No provider customer yet — still land on the in-app portal.
      return { url: returnUrl };
    }

    return billingService.createPortalSession({
      workspaceId: input.workspaceId,
      customerId: customer,
      returnUrl,
    });
  }

  if (!isStripeConfigured()) {
    return { url: returnUrl };
  }

  const customerId = await getOrCreateStripeCustomer(input);
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
