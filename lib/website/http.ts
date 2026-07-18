import { NextResponse } from "next/server";
import { WebsiteAuthError } from "@/lib/website/access";

export function websiteErrorResponse(error: unknown) {
  if (error instanceof WebsiteAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message =
    error instanceof Error ? error.message : "Unexpected website error.";

  let status = 400;
  if (
    message.includes("Authentication required") ||
    message.includes("Unauthorized")
  ) {
    status = 401;
  } else if (
    message.includes("not found") ||
    message.includes("Not found")
  ) {
    status = 404;
  } else if (
    message.includes("Plan limit") ||
    message.includes("plan allows") ||
    message.includes("Upgrade to continue")
  ) {
    status = 402;
  } else if (
    message.includes("not configured") ||
    message.includes("Storage quota")
  ) {
    status = 503;
  }

  console.error("[website]", error);
  return NextResponse.json({ error: message }, { status });
}
