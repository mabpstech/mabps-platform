import type { BillingProviderId } from "@/lib/billing/engine/types";
import { nullPaymentProvider } from "@/lib/billing/engine/providers/null";
import type {
  PaymentProviderAdapter,
  PaymentProviderRegistry,
} from "@/lib/billing/engine/providers/types";

const adapters = new Map<
  Exclude<BillingProviderId, "none">,
  PaymentProviderAdapter
>();

/**
 * In-memory registry for Stripe / Razorpay / Paddle adapters.
 * Foundation ships empty — adapters register at bootstrap later.
 */
export function createPaymentProviderRegistry(): PaymentProviderRegistry {
  return {
    get(id) {
      return adapters.get(id) ?? null;
    },
    listConfigured() {
      return Array.from(adapters.values()).filter((adapter) =>
        adapter.isConfigured(),
      );
    },
    register(adapter) {
      if (adapter.id === "none") {
        throw new Error(
          "Cannot register the null payment provider. Use nullPaymentProvider as a fallback instead.",
        );
      }
      adapters.set(adapter.id, adapter);
    },
  };
}

/** Process-wide default registry (shared across the Billing Engine). */
export const paymentProviderRegistry = createPaymentProviderRegistry();

export function getPaymentProvider(
  id: Exclude<BillingProviderId, "none">,
): PaymentProviderAdapter | null {
  return paymentProviderRegistry.get(id);
}

/**
 * Resolve a concrete adapter, or the null provider when none is registered.
 */
export function getPaymentProviderOrNull(
  id?: BillingProviderId,
): PaymentProviderAdapter {
  if (!id || id === "none") {
    return nullPaymentProvider;
  }
  return paymentProviderRegistry.get(id) ?? nullPaymentProvider;
}

export function listConfiguredPaymentProviders(): PaymentProviderAdapter[] {
  return paymentProviderRegistry.listConfigured();
}

/**
 * Prefer an explicitly configured provider, else first configured adapter.
 * Returns `none` when no payment gateway is registered yet.
 */
export function resolveActivePaymentProviderId(
  preferred?: Exclude<BillingProviderId, "none">,
): BillingProviderId {
  if (preferred) {
    const adapter = paymentProviderRegistry.get(preferred);
    if (adapter?.isConfigured()) {
      return preferred;
    }
  }
  const configured = paymentProviderRegistry.listConfigured();
  return configured[0]?.id ?? "none";
}

export {
  createNullPaymentProvider,
  nullPaymentProvider,
  NULL_PAYMENT_PROVIDER_MESSAGE,
} from "@/lib/billing/engine/providers/null";

export type {
  PaymentProviderAdapter,
  PaymentProviderRegistry,
  ProviderCancelInput,
  ProviderChangeSubscriptionInput,
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
