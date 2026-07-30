import { NextResponse } from "next/server";
import { processTrialEndingNotifications } from "@/lib/billing/engine/emails";
import { migrateBillingSchema } from "@/lib/billing/migrate";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";
import { secretsMatch } from "@/lib/platform/secrets-compare";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret =
    process.env.BILLING_JOB_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null;
  if (!secret) {
    // Allow in local/dev when no secret is configured.
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return secretsMatch(secret, auth.slice("Bearer ".length).trim());
  }

  return secretsMatch(secret, request.headers.get("x-billing-job-secret"));
}

/**
 * Cron/worker entrypoint: send trial-ending emails for subscriptions
 * within the notification window (default 3 days).
 */
export async function POST(request: Request) {
  const limited = enforcePublicRateLimit(request, "webhook");
  if (limited) return limited;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  migrateBillingSchema();

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const withinDays =
      typeof body.withinDays === "number" && Number.isFinite(body.withinDays)
        ? Math.min(Math.max(1, Math.floor(body.withinDays)), 14)
        : 3;

    const result = await processTrialEndingNotifications({ withinDays });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[billing/jobs/trial-ending]", error);
    const message =
      error instanceof Error ? error.message : "Trial-ending job failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
