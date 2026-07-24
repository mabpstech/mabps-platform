import { createHmac, timingSafeEqual } from "node:crypto";
import {
  getRazorpayPlanId,
} from "@/lib/billing/engine/providers/razorpay/client";
import type { ProviderWebhookEvent } from "@/lib/billing/engine/providers/types";
import {
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanId,
  PLAN_IDS,
} from "@/lib/billing/engine/plans";
import type { EngineSubscriptionStatus } from "@/lib/billing/engine/types";

const HANDLED_EVENTS = [
  "payment.success",
  "payment.failed",
  "subscription.activated",
  "subscription.cancelled",
] as const;

export type RazorpayHandledEvent = (typeof HANDLED_EVENTS)[number];

type RazorpayNotes = Record<string, unknown> | null | undefined;

type RazorpaySubscriptionEntity = {
  id?: string;
  customer_id?: string | null;
  plan_id?: string | null;
  status?: string | null;
  current_start?: number | null;
  current_end?: number | null;
  ended_at?: number | null;
  charge_at?: number | null;
  start_at?: number | null;
  notes?: RazorpayNotes;
};

type RazorpayPaymentEntity = {
  id?: string;
  amount?: number;
  currency?: string | null;
  status?: string | null;
  customer_id?: string | null;
  notes?: RazorpayNotes;
  invoice_id?: string | null;
};

export type RazorpayWebhookPayload = {
  entity?: string;
  event?: string;
  account_id?: string;
  contains?: string[];
  created_at?: number;
  payload?: {
    subscription?: { entity?: RazorpaySubscriptionEntity };
    payment?: { entity?: RazorpayPaymentEntity };
  };
};

function readHeader(
  headers: Headers | Record<string, string>,
  name: string,
): string | null {
  if (headers instanceof Headers) {
    return headers.get(name) ?? headers.get(name.toLowerCase());
  }
  const direct = headers[name] ?? headers[name.toLowerCase()];
  return typeof direct === "string" ? direct : null;
}

export function getRazorpayWebhookSecret(): string | null {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  return secret || null;
}

/**
 * Verify X-Razorpay-Signature (HMAC-SHA256 of the raw body with webhook secret).
 */
export function verifyRazorpayWebhookSignature(input: {
  rawBody: string | Buffer;
  signatureHeader: string | null | undefined;
  secret: string;
}): boolean {
  const header = input.signatureHeader?.trim();
  if (!header || !input.secret) return false;

  const expectedHex = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex");
  const providedHex = header.toLowerCase();

  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;

  return timingSafeEqual(expected, provided);
}

function noteString(notes: RazorpayNotes, key: string): string | undefined {
  if (!notes || typeof notes !== "object") return undefined;
  const value = notes[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toIsoFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Reverse-map a Razorpay plan_id env value to engine plan + interval.
 */
export function resolvePlanFromRazorpayPlanId(
  razorpayPlanId: string | null | undefined,
): { planId: PlanId; interval: BillingInterval } | null {
  if (!razorpayPlanId) return null;

  for (const planId of PLAN_IDS) {
    if (planId === "free") continue;
    for (const interval of ["monthly", "yearly"] as const) {
      if (getRazorpayPlanId(planId, interval) === razorpayPlanId) {
        return { planId, interval };
      }
    }
  }
  return null;
}

function mapRazorpaySubscriptionStatus(
  status: string | null | undefined,
): EngineSubscriptionStatus {
  switch (status) {
    case "active":
    case "authenticated":
      return "active";
    case "pending":
    case "created":
      return "incomplete";
    case "halted":
      return "past_due";
    case "paused":
      return "paused";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "completed":
    case "expired":
      return "expired";
    default:
      return "incomplete";
  }
}

function resolvePlanAndInterval(input: {
  notes?: RazorpayNotes;
  planId?: string | null;
}): { planId?: PlanId; interval?: BillingInterval } {
  const fromPlan = resolvePlanFromRazorpayPlanId(input.planId);
  const notePlan = noteString(input.notes, "planId");
  const noteInterval = noteString(input.notes, "interval");

  const planId =
    fromPlan?.planId ??
    (notePlan && isPlanId(notePlan) ? notePlan : undefined);
  const interval =
    fromPlan?.interval ??
    (noteInterval && isBillingInterval(noteInterval)
      ? noteInterval
      : undefined);

  return { planId, interval };
}

export function isRazorpayHandledEvent(
  event: string | undefined,
): event is RazorpayHandledEvent {
  return (
    typeof event === "string" &&
    (HANDLED_EVENTS as readonly string[]).includes(event)
  );
}

/**
 * Map a verified Razorpay webhook body into a provider-agnostic event.
 */
export function mapRazorpayWebhookPayload(
  payload: RazorpayWebhookPayload,
): ProviderWebhookEvent {
  const eventType = payload.event;
  if (!isRazorpayHandledEvent(eventType)) {
    return {
      type: "unhandled",
      providerEventType: eventType ?? "unknown",
    };
  }

  const subscription = payload.payload?.subscription?.entity;
  const payment = payload.payload?.payment?.entity;
  const notes = subscription?.notes ?? payment?.notes;
  const workspaceId = noteString(notes, "workspaceId");

  if (eventType === "subscription.cancelled") {
    const providerSubscriptionId = subscription?.id;
    if (!providerSubscriptionId) {
      return {
        type: "unhandled",
        providerEventType: eventType,
      };
    }
    return {
      type: "subscription.deleted",
      providerSubscriptionId,
      workspaceId,
    };
  }

  if (eventType === "payment.failed") {
    const providerInvoiceId = payment?.invoice_id || payment?.id;
    if (!providerInvoiceId) {
      return {
        type: "unhandled",
        providerEventType: eventType,
      };
    }
    return {
      type: "invoice.payment_failed",
      providerInvoiceId,
      workspaceId,
      amountPaid: payment?.amount,
      currency: payment?.currency ?? undefined,
    };
  }

  if (eventType === "subscription.activated") {
    const providerSubscriptionId = subscription?.id;
    if (!providerSubscriptionId) {
      return {
        type: "unhandled",
        providerEventType: eventType,
      };
    }
    const { planId, interval } = resolvePlanAndInterval({
      notes: subscription?.notes,
      planId: subscription?.plan_id,
    });
    return {
      type: "subscription.updated",
      subscription: {
        providerSubscriptionId,
        workspaceId,
        providerCustomerId: subscription?.customer_id ?? null,
        providerPriceId: subscription?.plan_id ?? null,
        status: mapRazorpaySubscriptionStatus(subscription?.status ?? "active"),
        planId,
        interval,
        currentPeriodStart: toIsoFromUnix(subscription?.current_start),
        currentPeriodEnd: toIsoFromUnix(
          subscription?.current_end ?? subscription?.charge_at,
        ),
        cancelAtPeriodEnd: false,
        canceledAt: toIsoFromUnix(subscription?.ended_at),
        trialStart: null,
        trialEnd: null,
        gracePeriodEnd: null,
      },
    };
  }

  // payment.success — confirm / recover paid access
  const { planId, interval } = resolvePlanAndInterval({
    notes: payment?.notes ?? subscription?.notes,
    planId: subscription?.plan_id,
  });
  const providerSubscriptionId = subscription?.id;

  if (providerSubscriptionId) {
    return {
      type: "subscription.updated",
      subscription: {
        providerSubscriptionId,
        workspaceId,
        providerCustomerId:
          subscription?.customer_id ?? payment?.customer_id ?? null,
        providerPriceId: subscription?.plan_id ?? null,
        status: "active",
        planId,
        interval,
        currentPeriodStart: toIsoFromUnix(subscription?.current_start),
        currentPeriodEnd: toIsoFromUnix(
          subscription?.current_end ?? subscription?.charge_at,
        ),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialStart: null,
        trialEnd: null,
        gracePeriodEnd: null,
      },
      amountPaid: payment?.amount,
      currency: payment?.currency ?? undefined,
    };
  }

  if (payment?.id) {
    return {
      type: "invoice.paid",
      providerInvoiceId: payment.id,
      workspaceId,
      amountPaid: payment.amount,
      currency: payment.currency ?? undefined,
    };
  }

  return {
    type: "checkout.completed",
    workspaceId,
    providerSubscriptionId,
  };
}

export function parseRazorpayWebhookPayload(
  rawBody: string | Buffer,
): RazorpayWebhookPayload {
  const text =
    typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  return JSON.parse(text) as RazorpayWebhookPayload;
}

/**
 * Verify signature and normalize a Razorpay webhook into ProviderWebhookEvent.
 */
export function verifyAndMapRazorpayWebhook(
  rawBody: string | Buffer,
  headers: Headers | Record<string, string>,
): ProviderWebhookEvent {
  const secret = getRazorpayWebhookSecret();
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
  }

  const signature = readHeader(headers, "x-razorpay-signature");
  if (
    !verifyRazorpayWebhookSignature({
      rawBody,
      signatureHeader: signature,
      secret,
    })
  ) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const payload = parseRazorpayWebhookPayload(rawBody);
  return mapRazorpayWebhookPayload(payload);
}

export function getRazorpayWebhookEventId(
  rawBody: string | Buffer,
  headers: Headers | Record<string, string>,
): string {
  const headerId = readHeader(headers, "x-razorpay-event-id");
  if (headerId?.trim()) {
    return headerId.trim();
  }

  const payload = parseRazorpayWebhookPayload(rawBody);
  const event = payload.event ?? "unknown";
  const subscriptionId = payload.payload?.subscription?.entity?.id;
  const paymentId = payload.payload?.payment?.entity?.id;
  const created = payload.created_at ?? 0;
  return `rzp_${event}_${subscriptionId ?? paymentId ?? "none"}_${created}`;
}
