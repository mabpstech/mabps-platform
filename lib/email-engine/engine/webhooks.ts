import { recordDeliveryEvent } from "@/lib/email-engine/engine/tracking";
import {
  createEmailLog,
  getMessageByProviderId,
  getSettingsByWebhookSecret,
} from "@/lib/email-engine/repository";
import type { EmailEventType, EmailSettings } from "@/lib/email-engine/types";

type NormalizedWebhookEvent = {
  type: EmailEventType;
  providerMessageId?: string;
  email?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

function mapResendType(type: string): EmailEventType | null {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.delivery_delayed":
    case "email.failed":
      return "failed";
    default:
      return null;
  }
}

function parseResendPayload(payload: unknown): NormalizedWebhookEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const type =
    typeof root.type === "string" ? mapResendType(root.type) : null;
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  if (!type) return [];

  return [
    {
      type,
      providerMessageId:
        typeof data.email_id === "string"
          ? data.email_id
          : typeof data.id === "string"
            ? data.id
            : undefined,
      email: Array.isArray(data.to)
        ? String(data.to[0] || "")
        : typeof data.to === "string"
          ? data.to
          : undefined,
      url:
        data.click &&
        typeof data.click === "object" &&
        typeof (data.click as Record<string, unknown>).link === "string"
          ? String((data.click as Record<string, unknown>).link)
          : undefined,
      metadata: data,
    },
  ];
}

function parseSesPayload(payload: unknown): NormalizedWebhookEvent[] {
  if (!payload || typeof payload !== "object") return [];
  let root = payload as Record<string, unknown>;

  // SNS wrapper
  if (typeof root.Message === "string") {
    try {
      root = JSON.parse(root.Message) as Record<string, unknown>;
    } catch {
      return [];
    }
  }

  const notificationType = String(
    root.notificationType || root.eventType || "",
  ).toLowerCase();
  const mail =
    root.mail && typeof root.mail === "object"
      ? (root.mail as Record<string, unknown>)
      : {};
  const providerMessageId =
    typeof mail.messageId === "string" ? mail.messageId : undefined;

  const events: NormalizedWebhookEvent[] = [];

  if (notificationType.includes("bounce")) {
    const bounce =
      root.bounce && typeof root.bounce === "object"
        ? (root.bounce as Record<string, unknown>)
        : {};
    const recipients = Array.isArray(bounce.bouncedRecipients)
      ? bounce.bouncedRecipients
      : [];
    for (const recipient of recipients) {
      const email =
        recipient && typeof recipient === "object"
          ? String(
              (recipient as Record<string, unknown>).emailAddress || "",
            )
          : "";
      events.push({
        type: "bounced",
        providerMessageId,
        email: email || undefined,
        metadata: root,
      });
    }
    if (!events.length) {
      events.push({ type: "bounced", providerMessageId, metadata: root });
    }
  } else if (notificationType.includes("complaint")) {
    events.push({ type: "complained", providerMessageId, metadata: root });
  } else if (notificationType.includes("delivery")) {
    events.push({ type: "delivered", providerMessageId, metadata: root });
  } else if (notificationType.includes("open")) {
    events.push({ type: "opened", providerMessageId, metadata: root });
  } else if (notificationType.includes("click")) {
    const click =
      root.click && typeof root.click === "object"
        ? (root.click as Record<string, unknown>)
        : {};
    events.push({
      type: "clicked",
      providerMessageId,
      url: typeof click.link === "string" ? click.link : undefined,
      metadata: root,
    });
  }

  return events;
}

function parseEvents(payload: unknown): NormalizedWebhookEvent[] {
  const resend = parseResendPayload(payload);
  if (resend.length) return resend;
  return parseSesPayload(payload);
}

export async function processEmailWebhook(input: {
  payload: unknown;
  secret?: string | null;
  settings?: EmailSettings | null;
}): Promise<{ processed: number; workspaceId?: string }> {
  let settings = input.settings || null;
  if (!settings && input.secret) {
    settings = getSettingsByWebhookSecret(input.secret);
  }
  if (!settings) {
    throw new Error("Email webhook workspace not found.");
  }

  const events = parseEvents(input.payload);
  let processed = 0;

  for (const event of events) {
    const message = event.providerMessageId
      ? getMessageByProviderId(settings.workspaceId, event.providerMessageId)
      : null;

    if (!message && !event.providerMessageId) continue;

    recordDeliveryEvent({
      workspaceId: settings.workspaceId,
      message,
      providerMessageId: event.providerMessageId,
      type: event.type,
      email: event.email,
      url: event.url,
      metadata: event.metadata,
    });
    processed += 1;
  }

  createEmailLog({
    workspaceId: settings.workspaceId,
    operation: "webhook_events",
    status: "success",
    provider: settings.provider,
    requestSummary: `Processed ${processed} provider event(s)`,
    metadata: { count: processed },
  });

  return { processed, workspaceId: settings.workspaceId };
}
