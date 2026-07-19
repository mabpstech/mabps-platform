import {
  ensureWorkspaceNotifications,
  listSubscriptions,
} from "@/lib/notifications/repository";
import type { NotificationChannelResult } from "@/lib/notifications/types";

/**
 * Web Push delivery.
 * When a custom push endpoint is configured, POSTs the payload there.
 * Otherwise records against active push subscriptions for client delivery.
 */
export async function deliverPush(input: {
  workspaceId: string;
  userId?: string | null;
  title: string;
  body: string;
  href?: string | null;
  priority: string;
  notificationId: string;
}): Promise<NotificationChannelResult> {
  const settings = ensureWorkspaceNotifications(input.workspaceId);
  if (!settings.pushEnabled) {
    return { ok: true, skipped: true, error: "Push channel disabled." };
  }

  const subscriptions = input.userId
    ? listSubscriptions(input.workspaceId, {
        userId: input.userId,
        channel: "push",
        activeOnly: true,
      })
    : [];

  const payload = {
    title: input.title,
    body: input.body,
    href: input.href,
    priority: input.priority,
    notificationId: input.notificationId,
    workspaceId: input.workspaceId,
    userId: input.userId,
  };

  if (settings.pushEndpoint) {
    const startedAt = Date.now();
    try {
      const response = await fetch(settings.pushEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.vapidPublicKey
            ? { "X-Vapid-Public-Key": settings.vapidPublicKey }
            : {}),
        },
        body: JSON.stringify({
          ...payload,
          subscriptions: subscriptions.map((row) => ({
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          })),
        }),
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          ok: false,
          error: `Push endpoint returned ${response.status}: ${text.slice(0, 200)}`,
          raw: { status: response.status, latencyMs: Date.now() - startedAt },
        };
      }
      return {
        ok: true,
        providerMessageId: `push-${input.notificationId}`,
        raw: {
          status: response.status,
          latencyMs: Date.now() - startedAt,
          response: text.slice(0, 500),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Push delivery failed.",
      };
    }
  }

  if (!subscriptions.length) {
    return {
      ok: true,
      skipped: true,
      error: "No active push subscriptions and no push endpoint configured.",
      raw: { payload },
    };
  }

  return {
    ok: true,
    providerMessageId: subscriptions[0].id,
    raw: {
      channel: "push",
      subscriptionCount: subscriptions.length,
      payload,
      note: "Queued for client/web-push delivery via stored subscriptions.",
    },
  };
}
