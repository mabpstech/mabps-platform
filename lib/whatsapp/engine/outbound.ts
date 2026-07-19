import {
  sendMediaMessage,
  sendTemplateMessage,
  sendTextMessage,
} from "@/lib/whatsapp/cloud/client";
import { normalizePhone, truncateSummary } from "@/lib/whatsapp/defaults";
import {
  createMessage,
  createWhatsAppLog,
  ensureOpenConversation,
  requireConnectedCredentials,
  updateMessage,
  upsertContact,
} from "@/lib/whatsapp/repository";
import type {
  WhatsAppCloudSendResult,
  WhatsAppMessage,
  WhatsAppSendMediaInput,
  WhatsAppSendTemplateInput,
} from "@/lib/whatsapp/types";

async function finalizeOutbound(input: {
  workspaceId: string;
  message: WhatsAppMessage;
  result: WhatsAppCloudSendResult;
  startedAt: number;
  operation: string;
  requestSummary: string;
}): Promise<WhatsAppMessage> {
  const latencyMs = Date.now() - input.startedAt;
  if (input.result.ok) {
    const updated = updateMessage(input.message.id, input.workspaceId, {
      status: "sent",
      providerMessageId: input.result.providerMessageId || null,
      raw: input.result.raw || {},
    });
    const phone =
      typeof input.message.metadata.to === "string"
        ? normalizePhone(input.message.metadata.to)
        : null;
    createWhatsAppLog({
      workspaceId: input.workspaceId,
      operation: input.operation,
      status: "success",
      direction: "outbound",
      phone,
      conversationId: updated.conversationId,
      messageId: updated.id,
      providerMessageId: updated.providerMessageId,
      latencyMs,
      requestSummary: input.requestSummary,
      responseSummary: updated.providerMessageId || "sent",
    });
    return updated;
  }

  const updated = updateMessage(input.message.id, input.workspaceId, {
    status: "failed",
    errorMessage: input.result.error || "Send failed.",
    raw: input.result.raw || {},
  });
  createWhatsAppLog({
    workspaceId: input.workspaceId,
    operation: input.operation,
    status: "error",
    direction: "outbound",
    phone:
      typeof input.message.metadata.to === "string"
        ? normalizePhone(input.message.metadata.to)
        : null,
    conversationId: updated.conversationId,
    messageId: updated.id,
    latencyMs,
    errorMessage: input.result.error || "Send failed.",
    requestSummary: input.requestSummary,
  });
  return updated;
}

export async function sendWhatsAppText(input: {
  workspaceId: string;
  to: string;
  text: string;
  previewUrl?: boolean;
  profileName?: string | null;
}): Promise<WhatsAppMessage> {
  const { settings, ...credentials } = requireConnectedCredentials(
    input.workspaceId,
  );
  const to = normalizePhone(input.to);
  if (!to || !input.text.trim()) {
    throw new Error("to and text are required.");
  }

  const contact = upsertContact({
    workspaceId: input.workspaceId,
    waId: to,
    phone: to,
    profileName: input.profileName,
  });
  const conversation = ensureOpenConversation({
    workspaceId: input.workspaceId,
    contact,
  });

  const message = createMessage({
    workspaceId: input.workspaceId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "outbound",
    type: "text",
    content: input.text,
    status: "queued",
    metadata: { to },
  });

  const startedAt = Date.now();
  const result = await sendTextMessage(
    {
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      wabaId: credentials.wabaId,
      apiVersion: credentials.apiVersion || settings.apiVersion,
    },
    { to, text: input.text, previewUrl: input.previewUrl },
  );

  return finalizeOutbound({
    workspaceId: input.workspaceId,
    message,
    result,
    startedAt,
    operation: "send_text",
    requestSummary: truncateSummary(input.text),
  });
}

export async function sendWhatsAppTemplate(input: {
  workspaceId: string;
  to: string;
  templateName: string;
  language?: string;
  bodyParams?: string[];
  profileName?: string | null;
}): Promise<WhatsAppMessage> {
  requireConnectedCredentials(input.workspaceId);
  const to = normalizePhone(input.to);
  if (!to || !input.templateName.trim()) {
    throw new Error("to and templateName are required.");
  }

  const contact = upsertContact({
    workspaceId: input.workspaceId,
    waId: to,
    phone: to,
    profileName: input.profileName,
  });
  const conversation = ensureOpenConversation({
    workspaceId: input.workspaceId,
    contact,
  });

  const message = createMessage({
    workspaceId: input.workspaceId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "outbound",
    type: "template",
    content: input.templateName,
    templateName: input.templateName,
    templateLanguage: input.language || "en_US",
    templateParams: input.bodyParams || [],
    status: "queued",
    metadata: { to },
  });

  const credentials = requireConnectedCredentials(input.workspaceId);
  const startedAt = Date.now();
  const payload: WhatsAppSendTemplateInput = {
    to,
    templateName: input.templateName,
    language: input.language,
    bodyParams: input.bodyParams,
  };
  const result = await sendTemplateMessage(
    {
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      wabaId: credentials.wabaId,
      apiVersion: credentials.apiVersion,
    },
    payload,
  );

  return finalizeOutbound({
    workspaceId: input.workspaceId,
    message,
    result,
    startedAt,
    operation: "send_template",
    requestSummary: truncateSummary(
      `${input.templateName} → ${to}`,
    ),
  });
}

export async function sendWhatsAppMedia(input: {
  workspaceId: string;
  to: string;
  type: WhatsAppSendMediaInput["type"];
  link?: string;
  mediaId?: string;
  caption?: string;
  filename?: string;
  profileName?: string | null;
}): Promise<WhatsAppMessage> {
  const credentials = requireConnectedCredentials(input.workspaceId);
  const to = normalizePhone(input.to);
  if (!to) throw new Error("to is required.");

  const contact = upsertContact({
    workspaceId: input.workspaceId,
    waId: to,
    phone: to,
    profileName: input.profileName,
  });
  const conversation = ensureOpenConversation({
    workspaceId: input.workspaceId,
    contact,
  });

  const message = createMessage({
    workspaceId: input.workspaceId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "outbound",
    type: input.type,
    content: input.caption || input.filename || input.link || input.mediaId,
    mediaId: input.mediaId || null,
    mediaUrl: input.link || null,
    status: "queued",
    metadata: { to },
  });

  const startedAt = Date.now();
  const result = await sendMediaMessage(
    {
      phoneNumberId: credentials.phoneNumberId,
      accessToken: credentials.accessToken,
      wabaId: credentials.wabaId,
      apiVersion: credentials.apiVersion,
    },
    {
      to,
      type: input.type,
      link: input.link,
      mediaId: input.mediaId,
      caption: input.caption,
      filename: input.filename,
    },
  );

  return finalizeOutbound({
    workspaceId: input.workspaceId,
    message,
    result,
    startedAt,
    operation: "send_media",
    requestSummary: truncateSummary(
      `${input.type} → ${to}${input.caption ? `: ${input.caption}` : ""}`,
    ),
  });
}
