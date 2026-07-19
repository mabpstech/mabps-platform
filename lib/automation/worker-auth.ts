import { timingSafeEqual } from "node:crypto";
import { AutomationAuthError } from "@/lib/automation/access";

const WORKER_SECRET_HEADER = "x-automation-worker-secret";

function secretsMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Authorize the automation queue tick endpoint for a background worker/cron.
 * Accepts either a session-backed manager (interactive) or AUTOMATION_WORKER_SECRET.
 */
export async function requireAutomationWorkerOrManager(
  request: Request,
  requireManager: () => Promise<unknown>,
): Promise<{ mode: "worker" | "manager" }> {
  const configured = process.env.AUTOMATION_WORKER_SECRET?.trim();
  const provided = request.headers.get(WORKER_SECRET_HEADER)?.trim();

  if (configured && provided && secretsMatch(configured, provided)) {
    return { mode: "worker" };
  }

  try {
    await requireManager();
    return { mode: "manager" };
  } catch (error) {
    if (configured && provided) {
      throw new AutomationAuthError("Invalid automation worker secret.", 401);
    }
    throw error;
  }
}

export { WORKER_SECRET_HEADER };
