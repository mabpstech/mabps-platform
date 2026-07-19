import { emitEmailEvent } from "@/lib/automation/events";
import {
  isValidEmail,
  normalizeEmail,
  truncateSummary,
} from "@/lib/email-engine/defaults";
import { recordEmailAnalyticsEvent } from "@/lib/email-engine/engine/analytics";
import { syncEmailContactToCrm } from "@/lib/email-engine/engine/crm-sync";
import {
  renderEmailTemplate,
  resolveEmailTemplate,
} from "@/lib/email-engine/engine/templates";
import {
  ensureTrackingToken,
  injectTracking,
} from "@/lib/email-engine/engine/tracking";
import { sendWithProvider } from "@/lib/email-engine/providers";
import {
  createEmailEvent,
  createEmailLog,
  createMessage,
  requireConnectedCredentials,
  updateMessage,
  upsertContact,
} from "@/lib/email-engine/repository";
import type {
  EmailMessage,
  EmailMessageKind,
  EmailSendInput,
} from "@/lib/email-engine/types";

export async function sendWorkspaceEmail(
  workspaceId: string,
  input: EmailSendInput,
): Promise<EmailMessage> {
  const credentials = requireConnectedCredentials(workspaceId);
  const settings = credentials.settings;
  const to = normalizeEmail(input.to);
  if (!isValidEmail(to)) throw new Error("Invalid recipient email.");

  let subject = input.subject?.trim() || "";
  let html = input.html || "";
  let text = input.text || "";

  const template = resolveEmailTemplate({
    workspaceId,
    templateId: input.templateId,
  });
  if (template) {
    const rendered = renderEmailTemplate(template, input.variables || {});
    subject = subject || rendered.subject;
    html = html || rendered.html;
    text = text || rendered.text;
  }

  if (!subject) throw new Error("subject is required.");
  if (!html && !text) {
    throw new Error("html or text body is required.");
  }
  if (!text && html) {
    text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  if (!html && text) {
    html = `<p>${text}</p>`;
  }

  const contact = settings.crmSyncEnabled
    ? syncEmailContactToCrm({
        workspaceId,
        email: to,
        name: input.toName,
      })
    : upsertContact({
        workspaceId,
        email: to,
        name: input.toName,
      });

  const kind: EmailMessageKind = input.kind || "transactional";
  const trackingToken = ensureTrackingToken();
  const trackedHtml = injectTracking({
    workspaceId,
    html,
    trackingToken,
    openTrackingEnabled: settings.openTrackingEnabled,
    clickTrackingEnabled: settings.clickTrackingEnabled,
  });

  const message = createMessage({
    workspaceId,
    contactId: contact.id,
    templateId: template?.id || input.templateId || null,
    campaignId: input.campaignId || null,
    kind,
    provider: credentials.provider,
    toEmail: to,
    toName: input.toName,
    fromEmail: credentials.fromEmail,
    fromName: credentials.fromName,
    replyTo: input.replyTo ?? settings.replyTo,
    subject,
    html: trackedHtml,
    text,
    status: "queued",
    trackingToken,
    metadata: input.metadata || {},
  });

  const startedAt = Date.now();
  const result = await sendWithProvider(credentials, {
    to,
    toName: input.toName,
    subject,
    html: trackedHtml,
    text,
    replyTo: input.replyTo ?? settings.replyTo,
  });

  const latencyMs = Date.now() - startedAt;

  if (!result.ok) {
    const failed = updateMessage(message.id, workspaceId, {
      status: "failed",
      errorMessage: result.error || "Send failed.",
      raw: result.raw || {},
    });
    createEmailLog({
      workspaceId,
      operation: kind === "marketing" ? "send_marketing" : "send_transactional",
      status: "error",
      provider: credentials.provider,
      email: to,
      messageId: failed.id,
      campaignId: failed.campaignId,
      latencyMs,
      errorMessage: failed.errorMessage,
      requestSummary: truncateSummary(`${subject} → ${to}`),
    });
    createEmailEvent({
      workspaceId,
      messageId: failed.id,
      campaignId: failed.campaignId,
      contactId: failed.contactId,
      type: "failed",
      email: to,
    });
    return failed;
  }

  const sentAt = new Date().toISOString();
  const sent = updateMessage(message.id, workspaceId, {
    status: "sent",
    providerMessageId: result.providerMessageId || null,
    sentAt,
    raw: result.raw || {},
  });

  upsertContact({
    workspaceId,
    email: to,
    name: input.toName,
    lastEmailAt: sentAt,
  });

  createEmailLog({
    workspaceId,
    operation: kind === "marketing" ? "send_marketing" : "send_transactional",
    status: "success",
    provider: credentials.provider,
    email: to,
    messageId: sent.id,
    campaignId: sent.campaignId,
    providerMessageId: sent.providerMessageId,
    latencyMs,
    requestSummary: truncateSummary(`${subject} → ${to}`),
    responseSummary: sent.providerMessageId || "sent",
  });

  createEmailEvent({
    workspaceId,
    messageId: sent.id,
    campaignId: sent.campaignId,
    contactId: sent.contactId,
    type: "sent",
    email: to,
    providerMessageId: sent.providerMessageId,
    occurredAt: sentAt,
  });

  recordEmailAnalyticsEvent({
    workspaceId,
    name: "email.sent",
    entityType: "email_message",
    entityId: sent.id,
    properties: {
      to,
      subject,
      kind,
      provider: credentials.provider,
      campaignId: sent.campaignId,
    },
    enabled: settings.analyticsEnabled,
  });

  if (settings.automationEnabled) {
    emitEmailEvent(workspaceId, "email.sent", {
      messageId: sent.id,
      email: to,
      subject,
      kind,
      campaignId: sent.campaignId,
      providerMessageId: sent.providerMessageId,
    });
  }

  return sent;
}

export async function sendTransactionalEmail(
  workspaceId: string,
  input: Omit<EmailSendInput, "kind">,
): Promise<EmailMessage> {
  return sendWorkspaceEmail(workspaceId, { ...input, kind: "transactional" });
}

export async function sendMarketingEmail(
  workspaceId: string,
  input: Omit<EmailSendInput, "kind">,
): Promise<EmailMessage> {
  return sendWorkspaceEmail(workspaceId, { ...input, kind: "marketing" });
}
