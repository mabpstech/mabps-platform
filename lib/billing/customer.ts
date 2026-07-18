import {
  getBillingCustomerByWorkspaceId,
  upsertBillingCustomer,
} from "@/lib/billing/repository";
import { getStripe } from "@/lib/billing/stripe";

export async function getOrCreateStripeCustomer(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
}): Promise<string> {
  const existing = getBillingCustomerByWorkspaceId(input.workspaceId);
  if (existing) {
    return existing.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.workspaceName,
    metadata: {
      workspaceId: input.workspaceId,
    },
  });

  upsertBillingCustomer({
    workspaceId: input.workspaceId,
    stripeCustomerId: customer.id,
    email: input.email,
  });

  return customer.id;
}
