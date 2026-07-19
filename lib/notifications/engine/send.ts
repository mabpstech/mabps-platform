import { emitNotificationEvent } from "@/lib/automation/events";
import { truncateSummary } from "@/lib/notifications/defaults";
import { deliverBrowser } from "@/lib/notifications/engine/channels/browser";
import { deliverEmail } from "@/lib/notifications/engine/channels/email";
import { deliverInApp } from "@/lib/notifications/engine/channels/in-app";
import { deliverPush } from "@/lib/notifications/engine/channels/push";
import { deliverWhatsApp } from "@/lib/notifications/engine/channels/whatsapp";
import { recordNotificationAnalyticsEvent } from "@/lib/notifications/engine/analytics";
import { syncNotificationToCrm } from "@/lib/notifications/engine/crm-sync";
import { resolveDeliveryChannels } from "@/lib/notifications/engine/preferences";
import {
  renderNotificationTemplate,
  resolveNotificationTemplate,
} from "@/lib/notifications/engine/templates";
import {
  createDelivery,
  createNotification,
  createNotificationEvent,
  createNotificationLog,
  updateNotification,
} from "@/lib/notifications/repository";
import type {
  AppNotification,
  NotificationChannel,
  NotificationChannelResult,
  NotificationSendInput,
} from "@/lib/notifications/types";

async function deliverChannel(
  channel: NotificationChannel,
  input: {
    workspaceId: string;
    notification: AppNotification;
    email?: string | null;
    phone?: string | null;
  },
): Promise<NotificationChannelResult> {
  const { workspaceId, notification } = input;
  switch (channel) {
    case "in_app":
      return deliverInApp();
    case "browser":
      return deliverBrowser({
        workspaceId,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        notificationId: notification.id,
      });
    case "push":
      return deliverPush({
        workspaceId,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        priority: notification.priority,
        notificationId: notification.id,
      });
    case "email":
      return deliverEmail({
        workspaceId,
        to: input.email,
        title: notification.title,
        body: notification.body,
        href: notification.href,
      });
    case "whatsapp":
      return deliverWhatsApp({
        workspaceId,
        phone: input.phone,
        title: notification.title,
        body: notification.body,
      });
  }
}

export async function sendWorkspaceNotification(
  workspaceId: string,
  input: NotificationSendInput,
): Promise<{
  notification: AppNotification;
  deliveries: Awaited<ReturnType<typeof createDelivery>>[];
}> {
  const title = input.title?.trim() || "";
  const body = input.body?.trim() || "";
  let resolvedTitle = title;
  let resolvedBody = body;
  let channels = input.channels;
  let priority = input.priority;
  let category = input.category;

  const template = resolveNotificationTemplate({
    workspaceId,
    templateId: input.templateId,
  });
  if (template) {
    const rendered = renderNotificationTemplate(
      template,
      input.variables || {},
    );
    resolvedTitle = resolvedTitle || rendered.title;
    resolvedBody = resolvedBody || rendered.body;
    channels = channels?.length ? channels : template.channels;
    priority = priority || template.priority;
    category = category || template.category;
  }

  if (!resolvedTitle) throw new Error("title is required.");
  if (!resolvedBody) throw new Error("body is required.");

  const resolved = resolveDeliveryChannels({
    workspaceId,
    userId: input.userId,
    requestedChannels: channels,
    category: category || "system",
  });

  const notification = createNotification({
    workspaceId,
    userId: input.userId,
    templateId: template?.id || input.templateId || null,
    category: category || "system",
    priority: priority || resolved.settings.defaultPriority,
    title: resolvedTitle,
    body: resolvedBody,
    href: input.href,
    status: "pending",
    channels: resolved.channels,
    crmEntityType: input.crmEntityType,
    crmEntityId: input.crmEntityId,
    metadata: input.metadata || {},
    createdByUserId: input.createdByUserId,
  });

  createNotificationEvent({
    workspaceId,
    notificationId: notification.id,
    userId: notification.userId,
    type: "created",
    metadata: {
      channels: resolved.channels,
      priority: notification.priority,
      category: notification.category,
    },
  });

  recordNotificationAnalyticsEvent({
    workspaceId,
    name: "notification.created",
    entityType: "notification",
    entityId: notification.id,
    userId: notification.userId,
    properties: {
      channels: resolved.channels,
      priority: notification.priority,
      category: notification.category,
    },
    enabled: resolved.settings.analyticsEnabled,
  });

  if (resolved.settings.automationEnabled) {
    emitNotificationEvent(workspaceId, "notification.created", {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title,
      category: notification.category,
      priority: notification.priority,
      channels: resolved.channels,
    });
  }

  const email =
    input.email || resolved.preference?.emailAddress || null;
  const phone =
    input.phone || resolved.preference?.phoneNumber || null;

  const deliveries = [];
  let anyDelivered = false;
  let anyFailed = false;
  let lastError: string | null = null;

  for (const channel of resolved.channels) {
    const startedAt = Date.now();
    const result = await deliverChannel(channel, {
      workspaceId,
      notification,
      email,
      phone,
    });
    const latencyMs = Date.now() - startedAt;
    const sentAt = new Date().toISOString();

    if (result.skipped) {
      deliveries.push(
        createDelivery({
          notificationId: notification.id,
          workspaceId,
          channel,
          status: "skipped",
          errorMessage: result.error || null,
          latencyMs,
          raw: result.raw || {},
        }),
      );
      createNotificationLog({
        workspaceId,
        operation: "deliver",
        status: "success",
        channel,
        notificationId: notification.id,
        userId: notification.userId,
        latencyMs,
        requestSummary: truncateSummary(
          `${channel} → ${notification.title}`,
        ),
        responseSummary: result.error || "skipped",
      });
      continue;
    }

    if (!result.ok) {
      anyFailed = true;
      lastError = result.error || "Delivery failed.";
      deliveries.push(
        createDelivery({
          notificationId: notification.id,
          workspaceId,
          channel,
          status: "failed",
          errorMessage: lastError,
          latencyMs,
          raw: result.raw || {},
          sentAt,
        }),
      );
      createNotificationLog({
        workspaceId,
        operation: "deliver",
        status: "error",
        channel,
        notificationId: notification.id,
        userId: notification.userId,
        latencyMs,
        errorMessage: lastError,
        requestSummary: truncateSummary(
          `${channel} → ${notification.title}`,
        ),
      });
      createNotificationEvent({
        workspaceId,
        notificationId: notification.id,
        userId: notification.userId,
        type: "failed",
        channel,
        metadata: { error: lastError },
      });
      continue;
    }

    anyDelivered = true;
    deliveries.push(
      createDelivery({
        notificationId: notification.id,
        workspaceId,
        channel,
        status: "delivered",
        providerMessageId: result.providerMessageId || null,
        latencyMs,
        raw: result.raw || {},
        sentAt,
        deliveredAt: sentAt,
      }),
    );
    createNotificationLog({
      workspaceId,
      operation: "deliver",
      status: "success",
      channel,
      notificationId: notification.id,
      userId: notification.userId,
      latencyMs,
      requestSummary: truncateSummary(`${channel} → ${notification.title}`),
      responseSummary: result.providerMessageId || "delivered",
    });
    createNotificationEvent({
      workspaceId,
      notificationId: notification.id,
      userId: notification.userId,
      type: "delivered",
      channel,
      metadata: { providerMessageId: result.providerMessageId },
    });
  }

  const deliveredAt = anyDelivered ? new Date().toISOString() : null;
  const failedAt = anyFailed && !anyDelivered ? new Date().toISOString() : null;
  const updated = updateNotification(workspaceId, notification.id, {
    status: anyDelivered ? "delivered" : anyFailed ? "failed" : "pending",
    deliveredAt,
    failedAt,
    errorMessage: anyDelivered ? null : lastError,
  });

  syncNotificationToCrm({ workspaceId, notification: updated });

  recordNotificationAnalyticsEvent({
    workspaceId,
    name: anyDelivered ? "notification.delivered" : "notification.failed",
    entityType: "notification",
    entityId: updated.id,
    userId: updated.userId,
    properties: {
      channels: resolved.channels,
      deliveryCount: deliveries.length,
    },
    enabled: resolved.settings.analyticsEnabled,
  });

  if (resolved.settings.automationEnabled) {
    emitNotificationEvent(
      workspaceId,
      anyDelivered ? "notification.delivered" : "notification.failed",
      {
        notificationId: updated.id,
        userId: updated.userId,
        title: updated.title,
        channels: resolved.channels,
        errorMessage: updated.errorMessage,
      },
    );
  }

  return { notification: updated, deliveries };
}
