import type { PlatformEvent, TriggerType } from "@/lib/automation/types";
import { TRIGGER_TYPES } from "@/lib/automation/types";

/**
 * Formal platform event schema / versioning (P3-6).
 * Emitters normalize through this module so workflow triggers share one contract.
 */

export const PLATFORM_EVENT_SCHEMA_VERSION = 1 as const;

export type EventFieldType =
  | "string"
  | "number"
  | "boolean"
  | "string[]"
  | "unknown";

export type EventFieldSpec = {
  name: string;
  type: EventFieldType;
  required?: boolean;
};

export type EventSchemaValidationMode = "strict" | "compat";

export type NormalizedPlatformEvent = PlatformEvent & {
  schemaVersion: number;
  occurredAt: string;
};

export class PlatformEventSchemaError extends Error {
  readonly code = "PLATFORM_EVENT_SCHEMA_INVALID";
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "PlatformEventSchemaError";
    this.details = details;
  }
}

/** Payload field contracts for known automation triggers. */
export const EVENT_PAYLOAD_SCHEMAS: Record<TriggerType, EventFieldSpec[]> = {
  manual: [],
  schedule: [],
  webhook: [
    { name: "body", type: "unknown" },
    { name: "headers", type: "unknown" },
  ],
  api: [
    { name: "body", type: "unknown" },
  ],
  "website.form_submitted": [
    { name: "siteId", type: "string", required: true },
    { name: "formId", type: "string" },
    { name: "pageId", type: "string" },
    { name: "submissionId", type: "string" },
    { name: "fields", type: "unknown" },
  ],
  "website.page_published": [
    { name: "siteId", type: "string", required: true },
    { name: "pageId", type: "string", required: true },
    { name: "slug", type: "string" },
  ],
  "crm.lead_created": [
    { name: "leadId", type: "string", required: true },
    { name: "contactId", type: "string" },
    { name: "status", type: "string" },
  ],
  "crm.lead_updated": [
    { name: "leadId", type: "string", required: true },
    { name: "contactId", type: "string" },
    { name: "status", type: "string" },
  ],
  "crm.deal_stage_changed": [
    { name: "dealId", type: "string", required: true },
    { name: "stage", type: "string", required: true },
    { name: "previousStage", type: "string" },
  ],
  "crm.contact_created": [
    { name: "contactId", type: "string", required: true },
    { name: "email", type: "string" },
  ],
  "crm.task_created": [
    { name: "taskId", type: "string", required: true },
    { name: "relatedType", type: "string" },
    { name: "relatedId", type: "string" },
  ],
  "chatbot.conversation_started": [
    { name: "conversationId", type: "string", required: true },
    { name: "botId", type: "string" },
  ],
  "chatbot.message_received": [
    { name: "conversationId", type: "string", required: true },
    { name: "messageId", type: "string" },
    { name: "botId", type: "string" },
  ],
  "chatbot.handoff_requested": [
    { name: "conversationId", type: "string", required: true },
    { name: "botId", type: "string" },
    { name: "reason", type: "string" },
  ],
  "chatbot.lead_captured": [
    { name: "conversationId", type: "string", required: true },
    { name: "leadId", type: "string" },
    { name: "email", type: "string" },
  ],
  "whatsapp.conversation_started": [
    { name: "conversationId", type: "string", required: true },
    { name: "contactId", type: "string" },
    { name: "phone", type: "string" },
  ],
  "whatsapp.message_received": [
    { name: "conversationId", type: "string", required: true },
    { name: "messageId", type: "string", required: true },
    { name: "contactId", type: "string" },
    { name: "phone", type: "string" },
  ],
  "email.sent": [
    { name: "messageId", type: "string", required: true },
    { name: "email", type: "string", required: true },
    { name: "subject", type: "string" },
    { name: "kind", type: "string" },
    { name: "campaignId", type: "string" },
    { name: "providerMessageId", type: "string" },
  ],
  "email.opened": [
    { name: "messageId", type: "string", required: true },
    { name: "email", type: "string" },
  ],
  "email.clicked": [
    { name: "messageId", type: "string", required: true },
    { name: "email", type: "string" },
    { name: "url", type: "string" },
  ],
  "email.bounced": [
    { name: "messageId", type: "string", required: true },
    { name: "email", type: "string" },
  ],
  "notification.created": [
    { name: "notificationId", type: "string", required: true },
    { name: "userId", type: "string" },
    { name: "title", type: "string" },
    { name: "category", type: "string" },
    { name: "priority", type: "string" },
    { name: "channels", type: "unknown" },
  ],
  "notification.delivered": [
    { name: "notificationId", type: "string", required: true },
    { name: "userId", type: "string" },
    { name: "title", type: "string" },
  ],
  "notification.read": [
    { name: "notificationId", type: "string", required: true },
    { name: "userId", type: "string" },
  ],
  "notification.failed": [
    { name: "notificationId", type: "string", required: true },
    { name: "userId", type: "string" },
    { name: "title", type: "string" },
  ],
};

function isFieldType(value: unknown, type: EventFieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "string[]":
      return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
      );
    case "unknown":
      return true;
    default:
      return true;
  }
}

export function isTriggerType(value: unknown): value is TriggerType {
  return (
    typeof value === "string" &&
    (TRIGGER_TYPES as readonly string[]).includes(value)
  );
}

export function getEventPayloadSchema(type: TriggerType): EventFieldSpec[] {
  return EVENT_PAYLOAD_SCHEMAS[type] ?? [];
}

export function resolveEventValidationMode(): EventSchemaValidationMode {
  const raw = (process.env.PLATFORM_EVENT_SCHEMA_MODE || "compat")
    .trim()
    .toLowerCase();
  return raw === "strict" ? "strict" : "compat";
}

/**
 * Validate + normalize an inbound platform event.
 * - `compat` (default): require known type + required fields; keep extra payload keys
 * - `strict`: also reject wrong types for declared fields
 */
export function normalizePlatformEvent(
  event: PlatformEvent,
  options: { mode?: EventSchemaValidationMode } = {},
): NormalizedPlatformEvent {
  const mode = options.mode ?? resolveEventValidationMode();
  const details: string[] = [];

  if (!event.workspaceId || typeof event.workspaceId !== "string") {
    details.push("workspaceId is required.");
  }
  if (!isTriggerType(event.type)) {
    details.push(`Unknown event type: ${String(event.type)}`);
  }

  const schemaVersion =
    typeof event.schemaVersion === "number" &&
    Number.isFinite(event.schemaVersion)
      ? Math.floor(event.schemaVersion)
      : PLATFORM_EVENT_SCHEMA_VERSION;

  if (schemaVersion !== PLATFORM_EVENT_SCHEMA_VERSION) {
    details.push(
      `Unsupported schemaVersion ${schemaVersion}; expected ${PLATFORM_EVENT_SCHEMA_VERSION}.`,
    );
  }

  const payload =
    event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? { ...event.payload }
      : {};

  if (isTriggerType(event.type)) {
    const fields = getEventPayloadSchema(event.type);
    for (const field of fields) {
      const value = payload[field.name];
      if (field.required && (value === undefined || value === null || value === "")) {
        details.push(`Missing required payload field "${field.name}".`);
        continue;
      }
      if (
        mode === "strict" &&
        value !== undefined &&
        value !== null &&
        !isFieldType(value, field.type)
      ) {
        details.push(
          `Payload field "${field.name}" must be ${field.type}.`,
        );
      }
    }
  }

  if (details.length) {
    throw new PlatformEventSchemaError(
      "Platform event failed schema validation.",
      details,
    );
  }

  return {
    type: event.type,
    workspaceId: event.workspaceId,
    payload,
    schemaVersion: PLATFORM_EVENT_SCHEMA_VERSION,
    occurredAt: event.occurredAt || new Date().toISOString(),
  };
}

export function listVersionedEventTypes(): Array<{
  type: TriggerType;
  schemaVersion: number;
  fields: EventFieldSpec[];
}> {
  return TRIGGER_TYPES.map((type) => ({
    type,
    schemaVersion: PLATFORM_EVENT_SCHEMA_VERSION,
    fields: getEventPayloadSchema(type),
  }));
}
