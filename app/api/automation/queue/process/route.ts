import { NextResponse } from "next/server";
import { requireAutomationManagerApi } from "@/lib/automation/access";
import { tickAutomationEngine } from "@/lib/automation/engine/scheduler";
import { automationErrorResponse } from "@/lib/automation/http";

/** Process due schedules + pending queue jobs (worker/cron entrypoint). */
export async function POST(request: Request) {
  try {
    await requireAutomationManagerApi();
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const limit =
      typeof body.limit === "number" && Number.isFinite(body.limit)
        ? Math.min(Math.max(1, Math.floor(body.limit)), 100)
        : 25;
    const result = await tickAutomationEngine({ queueLimit: limit });
    return NextResponse.json(result);
  } catch (error) {
    return automationErrorResponse(error);
  }
}
