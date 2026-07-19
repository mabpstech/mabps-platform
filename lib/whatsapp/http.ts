import { platformErrorResponse } from "@/lib/platform/http";
import {
  WHATSAPP_BROADCAST_STATUSES,
  WHATSAPP_MESSAGE_TYPES,
  type WhatsAppBroadcastStatus,
  type WhatsAppMessageType,
} from "@/lib/whatsapp/types";

export function whatsappErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "whatsapp",
    fallback: "Unexpected WhatsApp Integration error.",
  });
}

export function parseWhatsAppListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    direction: searchParams.get("direction")?.trim() || undefined,
    type: searchParams.get("type")?.trim() || undefined,
    conversationId: searchParams.get("conversationId")?.trim() || undefined,
    contactId: searchParams.get("contactId")?.trim() || undefined,
    limit:
      typeof limit === "number" && Number.isFinite(limit)
        ? Math.min(Math.max(1, Math.floor(limit)), 500)
        : undefined,
    offset:
      typeof offset === "number" && Number.isFinite(offset)
        ? Math.max(0, Math.floor(offset))
        : undefined,
  };
}

export function parseWhatsAppMessageType(
  value: unknown,
): WhatsAppMessageType | null {
  if (typeof value !== "string") return null;
  return WHATSAPP_MESSAGE_TYPES.includes(value as WhatsAppMessageType)
    ? (value as WhatsAppMessageType)
    : null;
}

export function parseWhatsAppBroadcastStatus(
  value: unknown,
): WhatsAppBroadcastStatus | null {
  if (typeof value !== "string") return null;
  return WHATSAPP_BROADCAST_STATUSES.includes(value as WhatsAppBroadcastStatus)
    ? (value as WhatsAppBroadcastStatus)
    : null;
}
