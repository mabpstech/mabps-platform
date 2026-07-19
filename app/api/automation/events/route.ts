import { NextResponse } from "next/server";
import { requireAutomationMemberApi } from "@/lib/automation/access";
import {
  emitAutomationEvent,
  PlatformEventSchemaError,
  listVersionedEventTypes,
  PLATFORM_EVENT_SCHEMA_VERSION,
} from "@/lib/automation/events";
import { automationErrorResponse } from "@/lib/automation/http";
import type { TriggerType } from "@/lib/automation/types";
import { TRIGGER_TYPES } from "@/lib/automation/types";

/**
 * Internal/platform event ingress for CRM, Website, and Chatbot events.
 * Prefer calling emitAutomationEvent() from module code; this route supports
 * API-first testing and external bridges.
 * Enqueues only — the background worker drains the queue.
 */
export async function POST(request: Request) {
  try {
    const { workspace } = await requireAutomationMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (
      typeof body.type !== "string" ||
      !(TRIGGER_TYPES as readonly string[]).includes(body.type)
    ) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
    }

    const result = emitAutomationEvent({
      type: body.type as TriggerType,
      workspaceId: workspace.id,
      payload:
        body.payload && typeof body.payload === "object"
          ? (body.payload as Record<string, unknown>)
          : {},
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : undefined,
      schemaVersion:
        typeof body.schemaVersion === "number" ? body.schemaVersion : undefined,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof PlatformEventSchemaError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 },
      );
    }
    return automationErrorResponse(error);
  }
}

/** Describe versioned event contracts for operators / external bridges. */
export async function GET() {
  try {
    await requireAutomationMemberApi();
    return NextResponse.json({
      schemaVersion: PLATFORM_EVENT_SCHEMA_VERSION,
      events: listVersionedEventTypes(),
    });
  } catch (error) {
    return automationErrorResponse(error);
  }
}
