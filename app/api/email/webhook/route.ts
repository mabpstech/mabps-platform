import { NextResponse } from "next/server";
import { processEmailWebhook } from "@/lib/email-engine/engine/webhooks";
import { emailErrorResponse } from "@/lib/email-engine/http";

/**
 * Multi-tenant provider webhook.
 * Prefer workspace-scoped `/api/email/webhook/[secret]`.
 * This route accepts payloads that include a `workspaceSecret` field.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const secret =
      payload &&
      typeof payload === "object" &&
      typeof (payload as Record<string, unknown>).workspaceSecret === "string"
        ? String((payload as Record<string, unknown>).workspaceSecret)
        : null;

    if (!secret) {
      return NextResponse.json(
        {
          error:
            "Use /api/email/webhook/[secret] or include workspaceSecret in the payload.",
        },
        { status: 400 },
      );
    }

    const result = await processEmailWebhook({ payload, secret });
    return NextResponse.json(result);
  } catch (error) {
    return emailErrorResponse(error);
  }
}
