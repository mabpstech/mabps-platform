import type { NotificationChannelResult } from "@/lib/notifications/types";

/** In-app channel: persistence is handled by the notification record itself. */
export async function deliverInApp(): Promise<NotificationChannelResult> {
  return {
    ok: true,
    providerMessageId: "in_app",
    raw: { channel: "in_app" },
  };
}
