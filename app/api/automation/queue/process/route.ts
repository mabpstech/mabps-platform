import { NextResponse } from "next/server";
import { requireAutomationManagerApi } from "@/lib/automation/access";
import { tickAutomationEngine } from "@/lib/automation/engine/scheduler";
import { automationErrorResponse } from "@/lib/automation/http";
import { requireAutomationWorkerOrManager } from "@/lib/automation/worker-auth";

/** Process due schedules + pending queue jobs (worker/cron entrypoint). */
export async function POST(request: Request) {
  try {
    const { mode } = await requireAutomationWorkerOrManager(
      request,
      requireAutomationManagerApi,
    );
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const limit =
      typeof body.limit === "number" && Number.isFinite(body.limit)
        ? Math.min(Math.max(1, Math.floor(body.limit)), 100)
        : 25;
    const workerId =
      typeof body.workerId === "string" && body.workerId.trim()
        ? body.workerId.trim().slice(0, 128)
        : mode === "worker"
          ? process.env.AUTOMATION_WORKER_ID?.trim() ||
            `worker_${process.pid}`
          : `manager_${process.pid}`;

    const result = await tickAutomationEngine({
      queueLimit: limit,
      workerId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return automationErrorResponse(error);
  }
}
