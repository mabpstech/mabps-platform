import { NextResponse } from "next/server";
import { BillingAuthError } from "@/lib/billing/access";

export function billingErrorResponse(error: unknown) {
  if (error instanceof BillingAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected billing error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (
    message.includes("not configured") ||
    message.includes("Stripe price")
  ) {
    status = 503;
  }

  console.error("[billing]", error);
  return NextResponse.json({ error: message }, { status });
}
