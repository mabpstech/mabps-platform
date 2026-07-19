import type { BillingInterval, PlanId } from "@/lib/billing/plans";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type WorkspaceSubscription = {
  id: string;
  workspaceId: string;
  planId: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCustomerId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingCustomer = {
  id: string;
  workspaceId: string;
  stripeCustomerId: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BillingInvoice = {
  id: string;
  workspaceId: string;
  stripeInvoiceId: string;
  stripeCustomerId: string | null;
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
  createdAt: string;
  updatedAt: string;
};

export type UsageMetric =
  | "members"
  | "sites"
  | "storageMb"
  | "aiCredits"
  | "automations"
  | "plugins";

export type UsageSnapshot = Record<UsageMetric, number>;
