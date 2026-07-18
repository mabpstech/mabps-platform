import { NextResponse } from "next/server";
import {
  constructStripeEvent,
  processStripeWebhookEvent,
} from "@/lib/billing/webhooks";
import { migrateBillingSchema } from "@/lib/billing/migrate";

export const runtime = "nodejs";

export async function POST(request: Request) {
  migrateBillingSchema();

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  try {
    const payload = await request.text();
    const event = await constructStripeEvent(payload, signature);
    const result = await processStripeWebhookEvent(event);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[billing/webhook]", error);
    const message =
      error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
