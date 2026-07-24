import { NextResponse } from "next/server";
import {
  getRazorpayWebhookEventId,
  parseRazorpayWebhookPayload,
} from "@/lib/billing/engine/providers/razorpay/webhook";
import { razorpayPaymentProvider } from "@/lib/billing/engine/providers/razorpay/provider";
import { processRazorpayWebhookEvent } from "@/lib/billing/engine/webhooks";
import { migrateBillingSchema } from "@/lib/billing/migrate";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

export const runtime = "nodejs";

/**
 * Razorpay Billing webhooks.
 * Handles payment.success, subscription.activated, subscription.cancelled
 * and updates the Billing Engine subscription lifecycle.
 */
export async function POST(request: Request) {
  const limited = enforcePublicRateLimit(request, "webhook");
  if (limited) return limited;

  migrateBillingSchema();

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header." },
      { status: 400 },
    );
  }

  try {
    const payload = await request.text();
    const event = await razorpayPaymentProvider.verifyWebhook(
      payload,
      request.headers,
    );
    const eventId = getRazorpayWebhookEventId(payload, request.headers);
    const rawEvent = parseRazorpayWebhookPayload(payload);
    const result = processRazorpayWebhookEvent({
      eventId,
      eventType: rawEvent.event ?? event.type,
      event,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[billing/webhook/razorpay]", error);
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
