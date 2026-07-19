import { platformErrorResponse } from "@/lib/platform/http";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TEMPLATE_STATUSES,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationTemplateStatus,
} from "@/lib/notifications/types";

export function notificationsErrorResponse(error: unknown) {
  return platformErrorResponse(error, {
    label: "notifications",
    fallback: "Unexpected Notifications error.",
  });
}

export function parseNotificationListFilters(searchParams: URLSearchParams) {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;
  const unreadOnly = searchParams.get("unreadOnly");

  return {
    q: searchParams.get("q")?.trim() || undefined,
    status: searchParams.get("status")?.trim() || undefined,
    priority: searchParams.get("priority")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    channel: searchParams.get("channel")?.trim() || undefined,
    userId: searchParams.get("userId")?.trim() || undefined,
    type: searchParams.get("type")?.trim() || undefined,
    unreadOnly:
      unreadOnly === "1" || unreadOnly === "true"
        ? true
        : unreadOnly === "0" || unreadOnly === "false"
          ? false
          : undefined,
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

export function parseNotificationChannel(
  value: unknown,
): NotificationChannel | null {
  if (typeof value !== "string") return null;
  return NOTIFICATION_CHANNELS.includes(value as NotificationChannel)
    ? (value as NotificationChannel)
    : null;
}

export function parseNotificationChannels(
  value: unknown,
): NotificationChannel[] | null {
  if (!Array.isArray(value)) return null;
  const channels = value
    .map((item) => parseNotificationChannel(item))
    .filter((item): item is NotificationChannel => Boolean(item));
  return channels.length ? channels : null;
}

export function parseNotificationPriority(
  value: unknown,
): NotificationPriority | null {
  if (typeof value !== "string") return null;
  return NOTIFICATION_PRIORITIES.includes(value as NotificationPriority)
    ? (value as NotificationPriority)
    : null;
}

export function parseNotificationCategory(
  value: unknown,
): NotificationCategory | null {
  if (typeof value !== "string") return null;
  return NOTIFICATION_CATEGORIES.includes(value as NotificationCategory)
    ? (value as NotificationCategory)
    : null;
}

export function parseNotificationTemplateStatus(
  value: unknown,
): NotificationTemplateStatus | null {
  if (typeof value !== "string") return null;
  return NOTIFICATION_TEMPLATE_STATUSES.includes(
    value as NotificationTemplateStatus,
  )
    ? (value as NotificationTemplateStatus)
    : null;
}
