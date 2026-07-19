import { NextResponse } from "next/server";
import { processAutomationQueue } from "@/lib/automation/engine/runner";
import { automationErrorResponse } from "@/lib/automation/http";
import {
  createRun,
  ensureAutomationReady,
  getWorkflowByWebhookSecret,
} from "@/lib/automation/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type RouteContext = { params: Promise<{ secret: string }> };

/** Inbound webhook trigger — authenticated by workflow webhook secret. */
export async function POST(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "automation");
  if (limited) return limited;

  try {
    ensureAutomationReady();
    const { secret } = await context.params;
    const workflow = getWorkflowByWebhookSecret(secret);
    if (!workflow) {
      return NextResponse.json({ error: "Webhook not found." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let payload: Record<string, unknown> = {};
    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      payload =
        body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    } else {
      const text = await request.text();
      payload = { raw: text };
    }

    const run = createRun({
      workspaceId: workflow.workspaceId,
      workflowId: workflow.id,
      triggerType: "webhook",
      triggerPayload: {
        ...payload,
        headers: {
          "content-type": contentType,
          "user-agent": request.headers.get("user-agent"),
        },
      },
    });

    // Best-effort immediate processing for low latency webhooks.
    const queue = await processAutomationQueue({ limit: 3 });
    return NextResponse.json({ ok: true, runId: run.id, queue }, { status: 202 });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
