import { NextResponse } from "next/server";
import { automationErrorResponse } from "@/lib/automation/http";
import {
  createRun,
  ensureAutomationReady,
  getWorkflowByApiKey,
} from "@/lib/automation/repository";
import { enforcePublicRateLimit } from "@/lib/platform/rate-limit";

type RouteContext = { params: Promise<{ apiKey: string }> };

/** API trigger — authenticated by workflow API key. */
export async function POST(request: Request, context: RouteContext) {
  const limited = enforcePublicRateLimit(request, "automation");
  if (limited) return limited;

  try {
    ensureAutomationReady();
    const { apiKey } = await context.params;
    const workflow = getWorkflowByApiKey(apiKey);
    if (!workflow) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const payload =
      body.payload && typeof body.payload === "object"
        ? (body.payload as Record<string, unknown>)
        : body;

    const run = createRun({
      workspaceId: workflow.workspaceId,
      workflowId: workflow.id,
      triggerType: "api",
      triggerPayload: payload,
    });

    // Enqueue only — the background worker drains the queue.
    return NextResponse.json({ ok: true, runId: run.id }, { status: 202 });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
