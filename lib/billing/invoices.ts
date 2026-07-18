import {
  getBillingCustomerByWorkspaceId,
  listInvoicesForWorkspace,
} from "@/lib/billing/repository";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { syncInvoiceFromStripe } from "@/lib/billing/stripe-sync";
import type { BillingInvoice } from "@/lib/billing/types";

/**
 * Return local invoice history, optionally refreshing from Stripe first.
 */
export async function getWorkspaceInvoices(
  workspaceId: string,
  options: { refresh?: boolean; limit?: number } = {},
): Promise<BillingInvoice[]> {
  const limit = options.limit ?? 50;

  if (options.refresh && isStripeConfigured()) {
    const customer = getBillingCustomerByWorkspaceId(workspaceId);
    if (customer) {
      try {
        const stripe = getStripe();
        const remote = await stripe.invoices.list({
          customer: customer.stripeCustomerId,
          limit,
        });
        for (const invoice of remote.data) {
          syncInvoiceFromStripe(invoice, workspaceId);
        }
      } catch (error) {
        console.error("[billing] Failed to refresh invoices from Stripe", error);
      }
    }
  }

  return listInvoicesForWorkspace(workspaceId, limit);
}
