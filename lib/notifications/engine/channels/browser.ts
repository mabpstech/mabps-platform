import { listSubscriptions } from "@/lib/notifications/repository";
import type { NotificationChannelResult } from "@/lib/notifications/types";

/**
 * Browser Notification API delivery.
 * Stores delivery against active browser subscriptions; clients poll/receive
 * via the notification center and subscription endpoint.
 */
export async function deliverBrowser(input: {
  workspaceId: string;
  userId?: string | null;
  title: string;
  body: string;
  href?: string | null;
  notificationId: string;
}): Promise<NotificationChannelResult> {
  if (!input.userId) {
    return {
      ok: true,
      skipped: true,
      error: "Browser notifications require a userId.",
    };
  }

  const subscriptions = listSubscriptions(input.workspaceId, {
    userId: input.userId,
    channel: "browser",
    activeOnly: true,
  });

  if (!subscriptions.length) {
    return {
      ok: true,
      skipped: true,
      error: "No active browser subscriptions.",
    };
  }

  return {
    ok: true,
    providerMessageId: subscriptions[0].id,
    raw: {
      channel: "browser",
      subscriptionCount: subscriptions.length,
      title: input.title,
      body: input.body,
      href: input.href,
      notificationId: input.notificationId,
      endpoints: subscriptions.map((row) => row.endpoint),
    },
  };
}
