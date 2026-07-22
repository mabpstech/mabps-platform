import type {
  BillingInterval,
  PlanId,
} from "@/lib/billing/engine/plans";
import type {
  BillingProviderId,
  EngineSubscriptionStatus,
  Subscription,
} from "@/lib/billing/engine/types";

/**
 * Payment provider adapter contract.
 * Stripe, Razorpay, and Paddle each implement this — no concrete SDK calls here.
 */
export type PaymentProviderAdapter = {
  readonly id: BillingProviderId;

  isConfigured(): boolean;

  createCheckout(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult>;

  verifyWebhook(
    rawBody: string | Buffer,
    headers: Headers | Record<string, string>,
  ): Promise<ProviderWebhookEvent>;

  cancelSubscription(input: ProviderCancelInput): Promise<void>;

  createCustomer(input: ProviderCustomerInput): Promise<ProviderCustomerResult>;

  getSubscription(
    input: ProviderGetSubscriptionInput,
  ): Promise<ProviderSubscriptionSnapshot | null>;

  createPortal(input: ProviderPortalInput): Promise<ProviderPortalResult>;

  listInvoices(input: ProviderListInvoicesInput): Promise<ProviderInvoice[]>;
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
  customerId?: string;
};

export type ProviderCheckoutResult = {
  url: string;
  sessionId?: string;
};

export type ProviderPortalInput = {
  workspaceId: string;
  customerId: string;
  returnUrl: string;
};

export type ProviderPortalResult = {
  url: string;
};

export type ProviderCustomerInput = {
  workspaceId: string;
  workspaceName: string;
  email: string;
  metadata?: Record<string, string>;
};

export type ProviderCustomerResult = {
  customerId: string;
};

export type ProviderGetSubscriptionInput = {
  workspaceId: string;
  providerSubscriptionId: string;
};

/**
 * Normalized subscription snapshot from a payment provider.
 * Adapters map gateway payloads into this shape.
 */
export type ProviderSubscriptionSnapshot = {
  providerSubscriptionId: string;
  providerCustomerId: string | null;
  providerPriceId: string | null;
  status: EngineSubscriptionStatus;
  planId?: PlanId;
  interval?: BillingInterval;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
};

export type ProviderCancelInput = {
  workspaceId: string;
  providerSubscriptionId: string;
  immediate?: boolean;
};

export type ProviderListInvoicesInput = {
  workspaceId: string;
  customerId: string;
  limit?: number;
};

/**
 * Provider-agnostic invoice row returned by adapters.
 */
export type ProviderInvoice = {
  providerInvoiceId: string;
  providerCustomerId: string | null;
  number: string | null;
  status: string | null;
  currency: string;
  amountDue: number;
  amountPaid: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
};

/**
 * Retained for plan-change wiring in a later commit (not required on the adapter surface).
 */
export type ProviderChangeSubscriptionInput = {
  workspaceId: string;
  providerSubscriptionId: string;
  planId: PlanId;
  interval: BillingInterval;
  /** Hint from engine preparePlanChange — adapters may use for proration. */
  isUpgrade: boolean;
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
