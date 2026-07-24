import {
  getRazorpayPlanId,
  isRazorpayConfigured,
  razorpayRequest,
} from "@/lib/billing/engine/providers/razorpay/client";
import { verifyAndMapRazorpayWebhook } from "@/lib/billing/engine/providers/razorpay/webhook";
import type { PaymentProviderAdapter } from "@/lib/billing/engine/providers/types";
import type {
  ProviderCancelInput,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  ProviderCustomerInput,
  ProviderCustomerResult,
  ProviderGetSubscriptionInput,
  ProviderInvoice,
  ProviderListInvoicesInput,
  ProviderPortalInput,
  ProviderPortalResult,
  ProviderSubscriptionSnapshot,
  ProviderWebhookEvent,
} from "@/lib/billing/engine/providers/types";

const NOT_IMPLEMENTED = {
  subscription:
    "Razorpay subscription creation is not implemented yet.",
  getSubscription: "Razorpay getSubscription is not implemented yet.",
} as const;

type RazorpayCustomerResponse = {
  id: string;
};

type RazorpaySubscriptionResponse = {
  id: string;
  short_url?: string | null;
};

type RazorpayInvoiceEntity = {
  id: string;
  customer_id?: string | null;
  receipt?: string | null;
  invoice_number?: string | null;
  status?: string | null;
  currency?: string | null;
  amount?: number;
  amount_paid?: number;
  short_url?: string | null;
  billing_start?: number | null;
  billing_end?: number | null;
  paid_at?: number | null;
};

type RazorpayInvoiceListResponse = {
  items?: RazorpayInvoiceEntity[];
};

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Razorpay PaymentProviderAdapter.
 * Checkout, customer, cancel, portal, invoices, and webhook verification are live.
 * Direct subscription create / getSubscription stay placeholders.
 */
export class RazorpayPaymentProvider implements PaymentProviderAdapter {
  readonly id = "razorpay" as const;

  isConfigured(): boolean {
    return isRazorpayConfigured();
  }

  async createCheckout(
    input: ProviderCheckoutInput,
  ): Promise<ProviderCheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }
    if (input.planId === "free") {
      throw new Error("Select a paid plan to start Razorpay checkout.");
    }

    const planId = getRazorpayPlanId(input.planId, input.interval);
    if (!planId) {
      throw new Error(
        `Razorpay plan is not configured for ${input.planId} (${input.interval}).`,
      );
    }

    const customerId =
      input.customerId ??
      (
        await this.createCustomer({
          workspaceId: input.workspaceId,
          workspaceName: input.workspaceName,
          email: input.email,
        })
      ).customerId;

    const totalCount = input.interval === "yearly" ? 10 : 120;
    const expireBy = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    const payload: Record<string, unknown> = {
      plan_id: planId,
      customer_id: customerId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      expire_by: expireBy,
      notes: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        interval: input.interval,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
      notify_info: {
        notify_email: input.email,
      },
    };

    if (input.trialDays && input.trialDays > 0) {
      payload.start_at =
        Math.floor(Date.now() / 1000) + input.trialDays * 24 * 60 * 60;
    }

    const subscription = await razorpayRequest<RazorpaySubscriptionResponse>(
      "POST",
      "/subscriptions",
      payload,
    );

    if (!subscription.short_url) {
      throw new Error("Razorpay did not return a checkout URL.");
    }

    return {
      url: subscription.short_url,
      sessionId: subscription.id,
    };
  }

  async createCustomer(
    input: ProviderCustomerInput,
  ): Promise<ProviderCustomerResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }

    const customer = await razorpayRequest<RazorpayCustomerResponse>(
      "POST",
      "/customers",
      {
        name: input.workspaceName,
        email: input.email,
        fail_existing: 0,
        notes: {
          workspaceId: input.workspaceId,
          ...(input.metadata ?? {}),
        },
      },
    );

    return { customerId: customer.id };
  }

  /**
   * Placeholder — direct subscription creation without hosted checkout.
   * Checkout uses the subscription-link path via createCheckout().
   */
  createSubscription(): Promise<never> {
    return Promise.reject(new Error(NOT_IMPLEMENTED.subscription));
  }

  verifyWebhook(
    rawBody: string | Buffer,
    headers: Headers | Record<string, string>,
  ): Promise<ProviderWebhookEvent> {
    return Promise.resolve(verifyAndMapRazorpayWebhook(rawBody, headers));
  }

  async cancelSubscription(input: ProviderCancelInput): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }
    if (!input.providerSubscriptionId) {
      throw new Error("Missing Razorpay subscription id for cancellation.");
    }

    await razorpayRequest(
      "POST",
      `/subscriptions/${input.providerSubscriptionId}/cancel`,
      {
        cancel_at_cycle_end: input.immediate ? 0 : 1,
      },
    );
  }

  getSubscription(
    _input: ProviderGetSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot | null> {
    return Promise.reject(new Error(NOT_IMPLEMENTED.getSubscription));
  }

  /**
   * Razorpay has no Stripe-style hosted portal — return the in-app billing portal URL.
   */
  async createPortal(input: ProviderPortalInput): Promise<ProviderPortalResult> {
    if (!this.isConfigured()) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }
    void input.customerId;
    void input.workspaceId;
    return { url: input.returnUrl };
  }

  async listInvoices(
    input: ProviderListInvoicesInput,
  ): Promise<ProviderInvoice[]> {
    if (!this.isConfigured()) {
      throw new Error(
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      );
    }
    if (!input.customerId) {
      return [];
    }

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
    const response = await razorpayRequest<RazorpayInvoiceListResponse>(
      "GET",
      `/invoices?customer_id=${encodeURIComponent(input.customerId)}&count=${limit}`,
    );

    return (response.items ?? []).map((invoice) => ({
      providerInvoiceId: invoice.id,
      providerCustomerId: invoice.customer_id ?? input.customerId,
      number: invoice.invoice_number ?? invoice.receipt ?? null,
      status: invoice.status ?? null,
      currency: (invoice.currency ?? "inr").toLowerCase(),
      amountDue: invoice.amount ?? 0,
      amountPaid: invoice.amount_paid ?? 0,
      hostedInvoiceUrl: invoice.short_url ?? null,
      invoicePdf: null,
      periodStart: toIsoFromUnix(invoice.billing_start),
      periodEnd: toIsoFromUnix(invoice.billing_end),
      paidAt: toIsoFromUnix(invoice.paid_at),
    }));
  }
}

export function createRazorpayPaymentProvider(): RazorpayPaymentProvider {
  return new RazorpayPaymentProvider();
}

export const razorpayPaymentProvider = createRazorpayPaymentProvider();
