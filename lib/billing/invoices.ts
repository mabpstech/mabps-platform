import { billingService } from "@/lib/billing/engine/create-service";
import { isRazorpayConfigured } from "@/lib/billing/engine/providers";
import {
  getBillingCustomerByWorkspaceId,
  listInvoicesForWorkspace,
  upsertInvoice,
} from "@/lib/billing/repository";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { syncInvoiceFromStripe } from "@/lib/billing/stripe-sync";
import type { BillingInvoice } from "@/lib/billing/types";

/**
 * Return local invoice history, optionally refreshing from the active provider.
 */
export async function getWorkspaceInvoices(
  workspaceId: string,
  options: { refresh?: boolean; limit?: number } = {},
): Promise<BillingInvoice[]> {
  const limit = options.limit ?? 50;

  if (options.refresh && isRazorpayConfigured()) {
    const customer = getBillingCustomerByWorkspaceId(workspaceId);
    const customerId =
      customer?.stripeCustomerId ??
      null;

    if (customerId) {
      try {
        const remote = await billingService.listInvoices({
          workspaceId,
          customerId,
          limit,
        });
        for (const invoice of remote) {
          upsertInvoice({
            workspaceId,
            stripeInvoiceId: invoice.providerInvoiceId,
            stripeCustomerId: invoice.providerCustomerId,
            number: invoice.number,
            status: invoice.status,
            currency: invoice.currency,
            amountDue: invoice.amountDue,
            amountPaid: invoice.amountPaid,
            hostedInvoiceUrl: invoice.hostedInvoiceUrl,
            invoicePdf: invoice.invoicePdf,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            paidAt: invoice.paidAt,
          });
        }
      } catch (error) {
        console.error(
          "[billing] Failed to refresh invoices from Razorpay",
          error,
        );
      }
    }

    return listInvoicesForWorkspace(workspaceId, limit);
  }

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
