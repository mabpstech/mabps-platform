import { processAutomationQueue } from "@/lib/automation/engine/runner";
import {
  createRun,
  getWorkflowById,
  listDueSchedules,
  markScheduleFired,
} from "@/lib/automation/repository";

/**
 * Fire due scheduled automations and process the execution queue.
 * Call from a cron/worker HTTP endpoint.
 */
export async function tickAutomationEngine(options: {
  queueLimit?: number;
} = {}): Promise<{
  schedulesFired: number;
  queue: { processed: number; failed: number; claimed: number };
}> {
  const due = listDueSchedules();
  let schedulesFired = 0;

  for (const schedule of due) {
    const workflow = getWorkflowById(schedule.workflowId);
    if (!workflow || workflow.status !== "active") {
      markScheduleFired(schedule.id, schedule.cronExpression);
      continue;
    }
    createRun({
      workspaceId: schedule.workspaceId,
      workflowId: schedule.workflowId,
      triggerType: "schedule",
      triggerPayload: {
        cron: schedule.cronExpression,
        timezone: schedule.timezone,
        scheduledFor: schedule.nextRunAt,
      },
    });
    markScheduleFired(schedule.id, schedule.cronExpression);
    schedulesFired += 1;
  }

  const queue = await processAutomationQueue({
    limit: options.queueLimit ?? 25,
  });

  return { schedulesFired, queue };
}
