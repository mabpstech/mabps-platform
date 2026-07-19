import { normalizePhone } from "@/lib/whatsapp/defaults";
import type { WhatsAppMessageType } from "@/lib/whatsapp/types";

export type ParsedInboundWhatsAppMessage = {
  phoneNumberId: string;
  waId: string;
  phone: string;
  profileName: string | null;
  providerMessageId: string;
  timestamp: string | null;
  type: WhatsAppMessageType;
  content: string | null;
  mediaId: string | null;
  mediaMimeType: string | null;
  raw: Record<string, unknown>;
};

export type ParsedStatusUpdate = {
  phoneNumberId: string;
  providerMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  recipientId: string | null;
  errorMessage: string | null;
  raw: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function extractTextBody(message: Record<string, unknown>): string | null {
  const text = asRecord(message.text);
  if (text && typeof text.body === "string") return text.body;

  const button = asRecord(message.button);
  if (button && typeof button.text === "string") return button.text;

  const interactive = asRecord(message.interactive);
  if (interactive) {
    const buttonReply = asRecord(interactive.button_reply);
    if (buttonReply && typeof buttonReply.title === "string") {
      return buttonReply.title;
    }
    const listReply = asRecord(interactive.list_reply);
    if (listReply && typeof listReply.title === "string") {
      return listReply.title;
    }
  }

  const location = asRecord(message.location);
  if (location) {
    const name = typeof location.name === "string" ? location.name : "Location";
    return `${name} (${location.latitude}, ${location.longitude})`;
  }

  return null;
}

function extractMedia(
  message: Record<string, unknown>,
  type: string,
): { mediaId: string | null; mimeType: string | null; caption: string | null } {
  const media = asRecord(message[type]);
  if (!media) return { mediaId: null, mimeType: null, caption: null };
  return {
    mediaId: typeof media.id === "string" ? media.id : null,
    mimeType: typeof media.mime_type === "string" ? media.mime_type : null,
    caption: typeof media.caption === "string" ? media.caption : null,
  };
}

function mapType(type: string): WhatsAppMessageType {
  const known: WhatsAppMessageType[] = [
    "text",
    "image",
    "audio",
    "video",
    "document",
    "sticker",
    "location",
    "contacts",
    "template",
    "interactive",
    "reaction",
  ];
  return known.includes(type as WhatsAppMessageType)
    ? (type as WhatsAppMessageType)
    : "unknown";
}

/**
 * Parse Meta WhatsApp Cloud API webhook payloads into normalized inbound events.
 */
export function parseWhatsAppWebhookPayload(payload: unknown): {
  messages: ParsedInboundWhatsAppMessage[];
  statuses: ParsedStatusUpdate[];
} {
  const root = asRecord(payload);
  const entries = Array.isArray(root?.entry) ? root!.entry : [];
  const messages: ParsedInboundWhatsAppMessage[] = [];
  const statuses: ParsedStatusUpdate[] = [];

  for (const entry of entries) {
    const entryObj = asRecord(entry);
    const changes = Array.isArray(entryObj?.changes) ? entryObj!.changes : [];
    for (const change of changes) {
      const changeObj = asRecord(change);
      const value = asRecord(changeObj?.value);
      if (!value) continue;

      const metadata = asRecord(value.metadata);
      const phoneNumberId =
        typeof metadata?.phone_number_id === "string"
          ? metadata.phone_number_id
          : "";
      if (!phoneNumberId) continue;

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contact0 = asRecord(contacts[0]);
      const profile = asRecord(contact0?.profile);
      const profileName =
        typeof profile?.name === "string" ? profile.name : null;
      const contactWaId =
        typeof contact0?.wa_id === "string" ? contact0.wa_id : null;

      const inboundMessages = Array.isArray(value.messages) ? value.messages : [];
      for (const message of inboundMessages) {
        const msg = asRecord(message);
        if (!msg) continue;
        const from = typeof msg.from === "string" ? msg.from : contactWaId;
        if (!from || typeof msg.id !== "string") continue;

        const type = mapType(typeof msg.type === "string" ? msg.type : "unknown");
        const mediaTypes = ["image", "audio", "video", "document", "sticker"] as const;
        let mediaId: string | null = null;
        let mediaMimeType: string | null = null;
        let content = extractTextBody(msg);

        if (mediaTypes.includes(type as (typeof mediaTypes)[number])) {
          const media = extractMedia(msg, type);
          mediaId = media.mediaId;
          mediaMimeType = media.mimeType;
          content = content || media.caption || `[${type}]`;
        }

        if (type === "reaction") {
          const reaction = asRecord(msg.reaction);
          content =
            typeof reaction?.emoji === "string" ? reaction.emoji : "[reaction]";
        }

        messages.push({
          phoneNumberId,
          waId: normalizePhone(from),
          phone: normalizePhone(from),
          profileName,
          providerMessageId: msg.id,
          timestamp: typeof msg.timestamp === "string" ? msg.timestamp : null,
          type,
          content,
          mediaId,
          mediaMimeType,
          raw: msg,
        });
      }

      const statusUpdates = Array.isArray(value.statuses) ? value.statuses : [];
      for (const status of statusUpdates) {
        const row = asRecord(status);
        if (!row || typeof row.id !== "string" || typeof row.status !== "string") {
          continue;
        }
        const statusValue = row.status;
        if (
          statusValue !== "sent" &&
          statusValue !== "delivered" &&
          statusValue !== "read" &&
          statusValue !== "failed"
        ) {
          continue;
        }
        const errors = Array.isArray(row.errors) ? row.errors : [];
        const firstError = asRecord(errors[0]);
        statuses.push({
          phoneNumberId,
          providerMessageId: row.id,
          status: statusValue,
          recipientId:
            typeof row.recipient_id === "string" ? row.recipient_id : null,
          errorMessage:
            typeof firstError?.message === "string"
              ? firstError.message
              : null,
          raw: row,
        });
      }
    }
  }

  return { messages, statuses };
}
