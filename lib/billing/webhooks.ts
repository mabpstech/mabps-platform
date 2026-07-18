import type Stripe from "stripe";
import {
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  upsertBillingCustomer,
} from "@/lib/billing/repository";
import { getStripe } from "@/lib/billing/stripe";
import {
  syncInvoiceFromStripe,
  syncSubscriptionFromStripe,
} from "@/lib/billing/stripe-sync";

export async function constructStripeEvent(
  payload: string | Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

export async function processStripeWebhookEvent(
  event: Stripe.Event,
): Promise<{ ok: true; duplicate?: boolean }> {
  if (hasProcessedWebhookEvent(event.id)) {
    return { ok: true, duplicate: true };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const workspaceId =
        session.metadata?.workspaceId ?? session.client_reference_id ?? null;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (workspaceId && customerId) {
        upsertBillingCustomer({
          workspaceId,
          stripeCustomerId: customerId,
          email: session.customer_details?.email ?? session.customer_email,
        });
      }

      if (subscriptionId) {
        const subscription =
          await getStripe().subscriptions.retrieve(subscriptionId);
        syncSubscriptionFromStripe(subscription, {
          workspaceId: workspaceId ?? undefined,
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      syncSubscriptionFromStripe(subscription);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.finalized":
    case "invoice.updated":
    case "invoice.voided": {
      const invoice = event.data.object as Stripe.Invoice;
      syncInvoiceFromStripe(invoice);
      break;
    }

    default:
      break;
  }

  markWebhookEventProcessed(event.id, event.type);
  return { ok: true };
}
