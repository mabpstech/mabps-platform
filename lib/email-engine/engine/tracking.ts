import {
  generateTrackingToken,
  hashIp,
  normalizeEmail,
} from "@/lib/email-engine/defaults";
import { recordEmailAnalyticsEvent } from "@/lib/email-engine/engine/analytics";
import {
  createEmailEvent,
  createEmailLog,
  ensureWorkspaceEmail,
  getMessageByProviderId,
  getMessageByTrackingToken,
  updateCampaign,
  updateMessage,
  upsertContact,
  getCampaignById,
} from "@/lib/email-engine/repository";
import type {
  EmailEventType,
  EmailMessage,
  EmailMessageStatus,
} from "@/lib/email-engine/types";
import { emitEmailEvent } from "@/lib/automation/events";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export function getTrackingPixelBuffer(): Buffer {
  return TRANSPARENT_GIF;
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function injectTracking(input: {
  workspaceId: string;
  html: string;
  trackingToken: string;
  openTrackingEnabled: boolean;
  clickTrackingEnabled: boolean;
}): string {
  let html = input.html;
  const base = appBaseUrl();

  if (input.clickTrackingEnabled) {
    html = html.replace(
      /href=["'](https?:\/\/[^"']+)["']/gi,
      (_match, url: string) => {
        const tracked = `${base}/api/email/track/click/${input.trackingToken}?u=${encodeURIComponent(url)}`;
        return `href="${tracked}"`;
      },
    );
  }

  if (input.openTrackingEnabled) {
    const pixel = `<img src="${base}/api/email/track/open/${input.trackingToken}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${pixel}</body>`);
    } else {
      html = `${html}${pixel}`;
    }
  }

  return html;
}

export function ensureTrackingToken(): string {
  return generateTrackingToken();
}

function statusAfterEvent(
  current: EmailMessageStatus,
  type: EmailEventType,
): EmailMessageStatus {
  if (type === "bounced") return "bounced";
  if (type === "complained") return "complained";
  if (type === "failed") return "failed";
  if (type === "clicked") return "clicked";
  if (type === "opened" && current !== "clicked") return "opened";
  if (type === "delivered" && ["queued", "sent"].includes(current)) {
    return "delivered";
  }
  if (type === "sent" && current === "queued") return "sent";
  return current;
}

export function recordDeliveryEvent(input: {
  workspaceId: string;
  message?: EmailMessage | null;
  providerMessageId?: string | null;
  type: EmailEventType;
  email?: string | null;
  url?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
}): EmailMessage | null {
  const settings = ensureWorkspaceEmail(input.workspaceId);
  let message = input.message || null;
  if (!message && input.providerMessageId) {
    message = getMessageByProviderId(
      input.workspaceId,
      input.providerMessageId,
    );
  }
  if (!message) return null;

  const timestamp = new Date().toISOString();
  const patch: Parameters<typeof updateMessage>[2] = {
    status: statusAfterEvent(message.status, input.type),
  };

  if (input.type === "delivered") patch.deliveredAt = timestamp;
  if (input.type === "opened") {
    patch.openedAt = message.openedAt || timestamp;
    patch.openCount = message.openCount + 1;
  }
  if (input.type === "clicked") {
    patch.clickedAt = message.clickedAt || timestamp;
    patch.clickCount = message.clickCount + 1;
    if (!message.openedAt) {
      patch.openedAt = timestamp;
      patch.openCount = Math.max(message.openCount, 1);
    }
  }
  if (input.type === "bounced") {
    patch.bouncedAt = timestamp;
    upsertContact({
      workspaceId: input.workspaceId,
      email: message.toEmail,
      status: "bounced",
    });
  }
  if (input.type === "complained") {
    upsertContact({
      workspaceId: input.workspaceId,
      email: message.toEmail,
      status: "complained",
    });
  }

  const updated = updateMessage(message.id, input.workspaceId, patch);

  createEmailEvent({
    workspaceId: input.workspaceId,
    messageId: updated.id,
    campaignId: updated.campaignId,
    contactId: updated.contactId,
    type: input.type,
    email: input.email || updated.toEmail,
    url: input.url,
    providerMessageId: updated.providerMessageId,
    userAgent: input.userAgent,
    ipHash: hashIp(input.ip),
    metadata: input.metadata,
    occurredAt: timestamp,
  });

  if (updated.campaignId) {
    const campaign = getCampaignById(updated.campaignId);
    if (campaign && campaign.workspaceId === input.workspaceId) {
      if (input.type === "opened") {
        updateCampaign(campaign.id, input.workspaceId, {
          openCount: campaign.openCount + 1,
        });
      } else if (input.type === "clicked") {
        updateCampaign(campaign.id, input.workspaceId, {
          clickCount: campaign.clickCount + 1,
        });
      } else if (input.type === "bounced") {
        updateCampaign(campaign.id, input.workspaceId, {
          bounceCount: campaign.bounceCount + 1,
        });
      }
    }
  }

  createEmailLog({
    workspaceId: input.workspaceId,
    operation: `event_${input.type}`,
    status: input.type === "bounced" || input.type === "failed" ? "error" : "success",
    provider: updated.provider,
    email: updated.toEmail,
    messageId: updated.id,
    campaignId: updated.campaignId,
    providerMessageId: updated.providerMessageId,
    requestSummary: `${input.type}${input.url ? `: ${input.url}` : ""}`,
  });

  recordEmailAnalyticsEvent({
    workspaceId: input.workspaceId,
    name: `email.${input.type}`,
    entityType: "email_message",
    entityId: updated.id,
    properties: {
      to: updated.toEmail,
      campaignId: updated.campaignId,
      url: input.url || null,
      kind: updated.kind,
    },
    enabled: settings.analyticsEnabled,
  });

  if (settings.automationEnabled) {
    const triggerMap: Partial<
      Record<EmailEventType, "email.opened" | "email.clicked" | "email.bounced" | "email.sent">
    > = {
      opened: "email.opened",
      clicked: "email.clicked",
      bounced: "email.bounced",
      sent: "email.sent",
    };
    const trigger = triggerMap[input.type];
    if (trigger) {
      emitEmailEvent(input.workspaceId, trigger, {
        messageId: updated.id,
        email: updated.toEmail,
        subject: updated.subject,
        campaignId: updated.campaignId,
        url: input.url || null,
        kind: updated.kind,
      });
    }
  }

  return updated;
}

export function trackOpen(input: {
  token: string;
  userAgent?: string | null;
  ip?: string | null;
}): EmailMessage | null {
  const message = getMessageByTrackingToken(input.token);
  if (!message) return null;
  const settings = ensureWorkspaceEmail(message.workspaceId);
  if (!settings.openTrackingEnabled) return message;
  return recordDeliveryEvent({
    workspaceId: message.workspaceId,
    message,
    type: "opened",
    email: normalizeEmail(message.toEmail),
    userAgent: input.userAgent,
    ip: input.ip,
  });
}

export function trackClick(input: {
  token: string;
  url: string;
  userAgent?: string | null;
  ip?: string | null;
}): { message: EmailMessage | null; redirectUrl: string } {
  const message = getMessageByTrackingToken(input.token);
  if (!message) {
    return { message: null, redirectUrl: input.url };
  }
  const settings = ensureWorkspaceEmail(message.workspaceId);
  if (settings.clickTrackingEnabled) {
    recordDeliveryEvent({
      workspaceId: message.workspaceId,
      message,
      type: "clicked",
      email: normalizeEmail(message.toEmail),
      url: input.url,
      userAgent: input.userAgent,
      ip: input.ip,
    });
  }
  return { message, redirectUrl: input.url };
}
