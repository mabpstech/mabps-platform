import type {
  BillingInterval,
  PlanId,
} from "@/lib/billing/engine/plans";
import type {
  BillingProviderId,
  Subscription,
} from "@/lib/billing/engine/types";

/**
 * Payment provider adapter contract.
 * Stripe, Razorpay, and Paddle each implement this — no concrete SDK calls here.
 */
export type PaymentProviderAdapter = {
  readonly id: Exclude<BillingProviderId, "none">;

  isConfigured(): boolean;

  createCheckoutSession(input: ProviderCheckoutInput): Promise<{
    url: string;
    sessionId?: string;
  }>;

  createCustomerPortalSession(input: ProviderPortalInput): Promise<{
    url: string;
  }>;

  changeSubscription(input: ProviderChangeSubscriptionInput): Promise<{
    subscriptionId: string;
  }>;

  cancelSubscription(input: ProviderCancelInput): Promise<void>;

  /**
   * Optional: verify and normalize provider webhooks into engine events.
   * Adapters may omit until webhook wiring lands.
   */
  parseWebhook?(
    rawBody: string | Buffer,
    headers: Headers | Record<string, string>,
  ): Promise<ProviderWebhookEvent>;
};

export type ProviderCheckoutInput = {
  workspaceId: string;
  workspaceName: string;
  email: string;
  planId: PlanId;
  interval: BillingInterval;
  trialDays?: number;
  successUrl: string;
  cancelUrl: string;
};

export type ProviderPortalInput = {
  workspaceId: string;
  customerId: string;
  returnUrl: string;
};

export type ProviderChangeSubscriptionInput = {
  workspaceId: string;
  providerSubscriptionId: string;
  planId: PlanId;
  interval: BillingInterval;
  /** Hint from engine preparePlanChange — adapters may use for proration. */
  isUpgrade: boolean;
};

export type ProviderCancelInput = {
  workspaceId: string;
  providerSubscriptionId: string;
  immediate?: boolean;
};

export type ProviderWebhookEvent =
  | {
      type: "subscription.updated";
      subscription: Partial<Subscription> & {
        providerSubscriptionId: string;
        workspaceId?: string;
      };
    }
  | {
      type: "subscription.deleted";
      providerSubscriptionId: string;
      workspaceId?: string;
    }
  | {
      type: "invoice.paid" | "invoice.payment_failed";
      providerInvoiceId: string;
      workspaceId?: string;
      amountPaid?: number;
      currency?: string;
    }
  | {
      type: "checkout.completed";
      workspaceId?: string;
      providerSubscriptionId?: string;
    }
  | {
      type: "unhandled";
      providerEventType: string;
    };

export type PaymentProviderRegistry = {
  get(id: Exclude<BillingProviderId, "none">): PaymentProviderAdapter | null;
  listConfigured(): PaymentProviderAdapter[];
  register(adapter: PaymentProviderAdapter): void;
};
