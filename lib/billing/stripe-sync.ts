import type Stripe from "stripe";
import {
  downgradeToFree,
  getBillingCustomerByStripeId,
  getSubscriptionByStripeId,
  upsertInvoice,
  upsertSubscription,
} from "@/lib/billing/repository";
import {
  isPlanId,
  resolvePlanFromPriceId,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/billing/types";

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

export function getSubscriptionItemPeriod(subscription: Stripe.Subscription): {
  start: string | null;
  end: string | null;
  priceId: string | null;
} {
  const item = subscription.items.data[0];
  return {
    start: toIsoFromUnix(item?.current_period_start),
    end: toIsoFromUnix(item?.current_period_end),
    priceId: typeof item?.price?.id === "string" ? item.price.id : null,
  };
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  return status as SubscriptionStatus;
}

function resolveWorkspaceIdFromSubscription(
  subscription: Stripe.Subscription,
): string | null {
  const fromMeta = subscription.metadata?.workspaceId;
  if (fromMeta) return fromMeta;

  const existing = getSubscriptionByStripeId(subscription.id);
  if (existing) return existing.workspaceId;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  return getBillingCustomerByStripeId(customerId)?.workspaceId ?? null;
}

export function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  options: { workspaceId?: string } = {},
): void {
  const workspaceId =
    options.workspaceId ?? resolveWorkspaceIdFromSubscription(subscription);
  if (!workspaceId) {
    console.warn(
      `[billing] Unable to resolve workspace for Stripe subscription ${subscription.id}`,
    );
    return;
  }

  const period = getSubscriptionItemPeriod(subscription);
  const resolved = resolvePlanFromPriceId(period.priceId);

  const metaPlan = subscription.metadata?.planId;
  const metaInterval = subscription.metadata?.interval;

  const planId: PlanId =
    resolved?.planId ??
    (metaPlan && isPlanId(metaPlan) ? metaPlan : "free");
  const interval: BillingInterval =
    resolved?.interval ??
    (metaInterval === "yearly" || metaInterval === "monthly"
      ? metaInterval
      : "monthly");

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    downgradeToFree(workspaceId);
    return;
  }

  upsertSubscription({
    workspaceId,
    planId,
    interval,
    status: mapStripeStatus(subscription.status),
    stripeSubscriptionId: subscription.id,
    stripePriceId: period.priceId,
    stripeCustomerId: customerId ?? null,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    canceledAt: toIsoFromUnix(subscription.canceled_at),
    trialEnd: toIsoFromUnix(subscription.trial_end),
  });
}

export function syncInvoiceFromStripe(
  invoice: Stripe.Invoice,
  workspaceIdHint?: string,
): void {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;

  let workspaceId =
    workspaceIdHint ??
    invoice.metadata?.workspaceId ??
    (customerId
      ? getBillingCustomerByStripeId(customerId)?.workspaceId
      : null);

  if (!workspaceId && invoice.parent?.subscription_details?.subscription) {
    const subRef = invoice.parent.subscription_details.subscription;
    const subId = typeof subRef === "string" ? subRef : subRef.id;
    workspaceId = getSubscriptionByStripeId(subId)?.workspaceId ?? null;
  }

  if (!workspaceId) {
    console.warn(
      `[billing] Unable to resolve workspace for Stripe invoice ${invoice.id}`,
    );
    return;
  }

  upsertInvoice({
    workspaceId,
    stripeInvoiceId: invoice.id,
    stripeCustomerId: customerId ?? null,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    periodStart: toIsoFromUnix(invoice.period_start),
    periodEnd: toIsoFromUnix(invoice.period_end),
    paidAt: toIsoFromUnix(invoice.status_transitions?.paid_at),
    createdAt: toIsoFromUnix(invoice.created),
  });
}
