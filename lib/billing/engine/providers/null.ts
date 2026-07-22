import type { PaymentProviderAdapter } from "@/lib/billing/engine/providers/types";

const NOT_CONFIGURED =
  "No payment provider is configured. Register a Stripe, Razorpay, or Paddle adapter.";

function rejectNotConfigured(): never {
  throw new Error(NOT_CONFIGURED);
}

/**
 * Null Object adapter — safe default when no gateway is registered.
 * All mutating / remote calls fail closed; isConfigured() is always false.
 */
export const nullPaymentProvider: PaymentProviderAdapter = {
  id: "none",

  isConfigured() {
    return false;
  },

  createCheckout() {
    return rejectNotConfigured();
  },

  verifyWebhook() {
    return rejectNotConfigured();
  },

  cancelSubscription() {
    return rejectNotConfigured();
  },

  createCustomer() {
    return rejectNotConfigured();
  },

  getSubscription() {
    return rejectNotConfigured();
  },

  createPortal() {
    return rejectNotConfigured();
  },

  listInvoices() {
    return rejectNotConfigured();
  },
};

export function createNullPaymentProvider(): PaymentProviderAdapter {
  return nullPaymentProvider;
}

export { NOT_CONFIGURED as NULL_PAYMENT_PROVIDER_MESSAGE };
