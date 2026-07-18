import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import { getAppBaseUrl, getStripe } from "@/lib/billing/stripe";

export async function createBillingPortalSession(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
}): Promise<{ url: string }> {
  const customerId = await getOrCreateStripeCustomer(input);
  const stripe = getStripe();
  const baseUrl = getAppBaseUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/settings/workspace/billing`,
  });

  return { url: session.url };
}
