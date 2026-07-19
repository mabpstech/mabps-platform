import {
  normalizePlatformEvent,
  PLATFORM_EVENT_SCHEMA_VERSION,
} from "@/lib/automation/event-schema";
import {
  createRun,
  ensureAutomationReady,
  listActiveWorkflowsByTrigger,
} from "@/lib/automation/repository";
import type { PlatformEvent, TriggerType } from "@/lib/automation/types";

export {
  EVENT_PAYLOAD_SCHEMAS,
  PLATFORM_EVENT_SCHEMA_VERSION,
  PlatformEventSchemaError,
  getEventPayloadSchema,
  listVersionedEventTypes,
  normalizePlatformEvent,
} from "@/lib/automation/event-schema";

/**
 * Emit a platform event into the Automation Engine.
 * Matching active workflows are enqueued (queue-based execution).
 * Other modules (CRM, Website, Chatbot) should call this after mutations.
 */
export function emitAutomationEvent(event: PlatformEvent): {
  enqueued: number;
  runIds: string[];
  schemaVersion: number;
} {
  ensureAutomationReady();
  const normalized = normalizePlatformEvent(event);
  const type = normalized.type;
  const workflows = listActiveWorkflowsByTrigger(normalized.workspaceId, type);
  const runIds: string[] = [];

  for (const workflow of workflows) {
    const filters = workflow.triggerConfig.filters;
    if (filters && typeof filters === "object") {
      // Optional shallow key match: triggerConfig.filters.field === payload.field
      const entries = Object.entries(filters as Record<string, unknown>);
      const matches = entries.every(([key, expected]) => {
        return normalized.payload[key] === expected;
      });
      if (!matches) continue;
    }

    const run = createRun({
      workspaceId: normalized.workspaceId,
      workflowId: workflow.id,
      triggerType: type,
      triggerPayload: {
        ...normalized.payload,
        _event: {
          type,
          schemaVersion: normalized.schemaVersion,
          occurredAt: normalized.occurredAt,
        },
      },
    });
    runIds.push(run.id);
  }

  return {
    enqueued: runIds.length,
    runIds,
    schemaVersion: PLATFORM_EVENT_SCHEMA_VERSION,
  };
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
