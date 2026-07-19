import { recordAnalyticsEvent } from "@/lib/analytics/consumers";

export function recordEmailAnalyticsEvent(input: {
  workspaceId: string;
  name: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  properties?: Record<string, unknown>;
  enabled?: boolean;
}): void {
  if (input.enabled === false) return;
  try {
    recordAnalyticsEvent({
      workspaceId: input.workspaceId,
      source: "email",
      name: input.name,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      userId: input.userId ?? null,
      properties: input.properties,
    });
  } catch (error) {
    console.error("[email-engine:analytics]", error);
  }
}
