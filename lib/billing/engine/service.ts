import type {
  BillingInterval,
  PlanId,
} from "@/lib/billing/engine/plans";
import type {
  BillingProviderId,
  PlanChangePreparation,
  ResolvedPlan,
  Subscription,
} from "@/lib/billing/engine/types";
import type { ProviderInvoice } from "@/lib/billing/engine/providers/types";
import type { UsageSnapshot } from "@/lib/billing/types";

/**
 * Billing Engine service contract.
 * Implementations orchestrate domain resolution + a PaymentProviderAdapter.
 * No gateway is wired in this foundation commit.
 */
export type BillingService = {
  resolveCurrentPlan(workspaceId: string): ResolvedPlan | Promise<ResolvedPlan>;

  preparePlanChange(input: {
    workspaceId: string;
    targetPlanId: PlanId;
    targetInterval: BillingInterval;
    usage?: UsageSnapshot;
  }): PlanChangePreparation | Promise<PlanChangePreparation>;

  /**
   * Apply a prepared plan change through the active payment provider.
   * Checkout initiation is wired; provider updates and cancel stay deferred.
   */
  applyPlanChange(input: {
    workspaceId: string;
    workspaceName: string;
    email: string;
    targetPlanId: PlanId;
    targetInterval: BillingInterval;
  }): Promise<BillingPlanChangeResult>;

  startTrial(input: {
    workspaceId: string;
    planId: PlanId;
    days?: number;
  }): Promise<Subscription>;

  cancelSubscription(input: {
    workspaceId: string;
    immediate?: boolean;
  }): Promise<void>;

  /**
   * Open the customer billing portal (provider-hosted or in-app return URL).
   */
  createPortalSession(input: {
    workspaceId: string;
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  /**
   * List provider invoices for a billing customer (synced or remote).
   */
  listInvoices(input: {
    workspaceId: string;
    customerId: string;
    limit?: number;
  }): Promise<ProviderInvoice[]>;

  getActiveProvider(): BillingProviderId;
};

export type BillingPlanChangeResult = {
  preparation: PlanChangePreparation;
  checkoutUrl?: string;
  portalUrl?: string;
  subscriptionId?: string;
};

export type BillingServiceContext = {
  providerId: BillingProviderId;
};
