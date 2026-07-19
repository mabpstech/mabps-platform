import { channelPreferenceKey } from "@/lib/notifications/defaults";
import {
  ensurePreference,
  ensureWorkspaceNotifications,
} from "@/lib/notifications/repository";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreference,
  NotificationSettings,
} from "@/lib/notifications/types";

function inQuietHours(preference: NotificationPreference): boolean {
  if (!preference.quietHoursStart || !preference.quietHoursEnd) return false;
  const start = preference.quietHoursStart.trim();
  const end = preference.quietHoursEnd.trim();
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return false;

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: preference.timezone || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((part) => part.type === "hour")?.value || "00";
    const minute = parts.find((part) => part.type === "minute")?.value || "00";
    const now = `${hour}:${minute}`;

    if (start <= end) {
      return now >= start && now < end;
    }
    // Overnight window, e.g. 22:00–07:00
    return now >= start || now < end;
  } catch {
    return false;
  }
}

export function resolveDeliveryChannels(input: {
  workspaceId: string;
  userId?: string | null;
  requestedChannels?: NotificationChannel[];
  category: NotificationCategory;
}): {
  settings: NotificationSettings;
  preference: NotificationPreference | null;
  channels: NotificationChannel[];
} {
  const settings = ensureWorkspaceNotifications(input.workspaceId);
  const preference = input.userId
    ? ensurePreference(input.workspaceId, input.userId)
    : null;

  const workspaceEnabled: Record<NotificationChannel, boolean> = {
    in_app: settings.inAppEnabled,
    push: settings.pushEnabled,
    email: settings.emailEnabled,
    whatsapp: settings.whatsappEnabled,
    browser: settings.browserEnabled,
  };

  let channels =
    input.requestedChannels && input.requestedChannels.length
      ? [...input.requestedChannels]
      : [...settings.defaultChannels];

  if (preference?.categoryOverrides?.[input.category]?.length) {
    channels = [...preference.categoryOverrides[input.category]];
  }

  const quiet = preference ? inQuietHours(preference) : false;

  channels = channels.filter((channel) => {
    if (!workspaceEnabled[channel]) return false;
    if (!preference) return true;
    if (quiet && channel !== "in_app") return false;
    return Boolean(preference[channelPreferenceKey(channel)]);
  });

  if (!channels.length && settings.inAppEnabled) {
    channels = ["in_app"];
  }

  return { settings, preference, channels };
}
