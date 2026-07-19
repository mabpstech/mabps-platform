import {
  createRun,
  ensureAutomationReady,
  listActiveWorkflowsByTrigger,
} from "@/lib/automation/repository";
import type { PlatformEvent, TriggerType } from "@/lib/automation/types";

/**
 * Emit a platform event into the Automation Engine.
 * Matching active workflows are enqueued (queue-based execution).
 * Other modules (CRM, Website, Chatbot) should call this after mutations.
 */
export function emitAutomationEvent(event: PlatformEvent): {
  enqueued: number;
  runIds: string[];
} {
  ensureAutomationReady();
  const type = event.type;
  const workflows = listActiveWorkflowsByTrigger(event.workspaceId, type);
  const runIds: string[] = [];

  for (const workflow of workflows) {
    const filters = workflow.triggerConfig.filters;
    if (filters && typeof filters === "object") {
      // Optional shallow key match: triggerConfig.filters.field === payload.field
      const entries = Object.entries(filters as Record<string, unknown>);
      const matches = entries.every(([key, expected]) => {
        return event.payload[key] === expected;
      });
      if (!matches) continue;
    }

    const run = createRun({
      workspaceId: event.workspaceId,
      workflowId: workflow.id,
      triggerType: type,
      triggerPayload: {
        ...event.payload,
        _event: {
          type,
          occurredAt: event.occurredAt ?? new Date().toISOString(),
        },
      },
    });
    runIds.push(run.id);
  }

  return { enqueued: runIds.length, runIds };
}

export function emitWebsiteEvent(
  workspaceId: string,
  type: Extract<TriggerType, `website.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}

export function emitCrmEvent(
  workspaceId: string,
  type: Extract<TriggerType, `crm.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}

export function emitChatbotEvent(
  workspaceId: string,
  type: Extract<TriggerType, `chatbot.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}

export function emitWhatsAppEvent(
  workspaceId: string,
  type: Extract<TriggerType, `whatsapp.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}

export function emitEmailEvent(
  workspaceId: string,
  type: Extract<TriggerType, `email.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}

export function emitNotificationEvent(
  workspaceId: string,
  type: Extract<TriggerType, `notification.${string}`>,
  payload: Record<string, unknown>,
) {
  return emitAutomationEvent({ type, workspaceId, payload });
}
