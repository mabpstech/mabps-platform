import { emitAutomationEvent } from "@/lib/automation/events";
import {
  markMessageAsRead,
  resolveMediaUrl,
} from "@/lib/whatsapp/cloud/client";
import { truncateSummary } from "@/lib/whatsapp/defaults";
import { routeInboundToChatbot } from "@/lib/whatsapp/engine/chatbot-bridge";
import { syncWhatsAppContactToCrm } from "@/lib/whatsapp/engine/crm-sync";
import {
  parseWhatsAppWebhookPayload,
  type ParsedInboundWhatsAppMessage,
} from "@/lib/whatsapp/engine/parse";
import {
  createMessage,
  createMedia,
  createWhatsAppLog,
  ensureOpenConversation,
  getMessageByProviderId,
  getSettingsByPhoneNumberId,
  requireConnectedCredentials,
  updateMessage,
} from "@/lib/whatsapp/repository";
import type { WhatsAppMessage, WhatsAppMessageStatus } from "@/lib/whatsapp/types";

async function persistInboundMessage(
  workspaceId: string,
  parsed: ParsedInboundWhatsAppMessage,
): Promise<WhatsAppMessage | null> {
  if (getMessageByProviderId(parsed.providerMessageId)) {
    return null;
  }

  const contact = syncWhatsAppContactToCrm({
    workspaceId,
    waId: parsed.waId,
    phone: parsed.phone,
    profileName: parsed.profileName,
  });
  const conversation = ensureOpenConversation({ workspaceId, contact });
  const isNewConversation = !conversation.lastInboundAt;

  let mediaUrl: string | null = null;
  if (parsed.mediaId) {
    try {
      const credentials = requireConnectedCredentials(workspaceId);
      const media = await resolveMediaUrl(
        {
          phoneNumberId: credentials.phoneNumberId,
          accessToken: credentials.accessToken,
          wabaId: credentials.wabaId,
          apiVersion: credentials.apiVersion,
        },
        parsed.mediaId,
      );
      if (media.ok && media.url) {
        mediaUrl = media.url;
        createMedia({
          workspaceId,
          providerMediaId: parsed.mediaId,
          mimeType: media.mimeType || parsed.mediaMimeType,
          fileSize: media.fileSize ?? null,
          sha256: media.sha256 ?? null,
          sourceUrl: media.url,
          direction: "inbound",
        });
      }
    } catch (error) {
      console.error("[whatsapp/media]", error);
    }
  }

  const message = createMessage({
    workspaceId,
    conversationId: conversation.id,
    contactId: contact.id,
    direction: "inbound",
    type: parsed.type,
    content: parsed.content,
    mediaId: parsed.mediaId,
    mediaUrl,
    mediaMimeType: parsed.mediaMimeType,
    status: "received",
    providerMessageId: parsed.providerMessageId,
    raw: parsed.raw,
  });

  createWhatsAppLog({
    workspaceId,
    operation: "webhook_inbound",
    status: "success",
    direction: "inbound",
    phone: parsed.phone,
    conversationId: conversation.id,
    messageId: message.id,
    providerMessageId: parsed.providerMessageId,
    requestSummary: truncateSummary(parsed.content || `[${parsed.type}]`),
  });

  const settings = getSettingsByPhoneNumberId(parsed.phoneNumberId);
  if (settings?.automationEnabled) {
    if (isNewConversation) {
      emitAutomationEvent({
        type: "whatsapp.conversation_started",
        workspaceId,
        payload: {
          conversationId: conversation.id,
          contactId: contact.id,
          phone: contact.phone,
          profileName: contact.profileName,
          crmContactId: contact.crmContactId,
          crmLeadId: contact.crmLeadId,
        },
      });
    }
    emitAutomationEvent({
      type: "whatsapp.message_received",
      workspaceId,
      payload: {
        conversationId: conversation.id,
        messageId: message.id,
        contactId: contact.id,
        phone: contact.phone,
        content: message.content,
        type: message.type,
        crmContactId: contact.crmContactId,
        crmLeadId: contact.crmLeadId,
      },
    });
  }

  if (settings?.chatbotEnabled) {
    try {
      await routeInboundToChatbot({
        workspaceId,
        contact,
        conversation,
        inboundMessage: message,
      });
    } catch (error) {
      console.error("[whatsapp/chatbot]", error);
      createWhatsAppLog({
        workspaceId,
        operation: "chatbot_bridge",
        status: "error",
        direction: "inbound",
        conversationId: conversation.id,
        messageId: message.id,
        errorMessage:
          error instanceof Error ? error.message : "Chatbot bridge failed.",
      });
    }
  }

  try {
    const credentials = requireConnectedCredentials(workspaceId);
    await markMessageAsRead(
      {
        phoneNumberId: credentials.phoneNumberId,
        accessToken: credentials.accessToken,
        wabaId: credentials.wabaId,
        apiVersion: credentials.apiVersion,
      },
      parsed.providerMessageId,
    );
  } catch {
    // Non-fatal: read receipts are best-effort.
  }

  return message;
}

function applyStatusUpdate(input: {
  providerMessageId: string;
  status: WhatsAppMessageStatus;
  errorMessage: string | null;
}): void {
  const existing = getMessageByProviderId(input.providerMessageId);
  if (!existing) return;
  updateMessage(existing.id, existing.workspaceId, {
    status: input.status,
    errorMessage: input.errorMessage,
  });
  createWhatsAppLog({
    workspaceId: existing.workspaceId,
    operation: "webhook_status",
    status: input.status === "failed" ? "error" : "success",
    direction: "outbound",
    conversationId: existing.conversationId,
    messageId: existing.id,
    providerMessageId: existing.providerMessageId,
    requestSummary: input.status,
    errorMessage: input.errorMessage,
  });
}

/**
 * Handle an authenticated Meta Cloud API webhook payload for one or more workspaces.
 */
export async function processWhatsAppWebhook(payload: unknown): Promise<{
  processedMessages: number;
  processedStatuses: number;
  workspaceIds: string[];
}> {
  const { messages, statuses } = parseWhatsAppWebhookPayload(payload);
  const workspaceIds = new Set<string>();
  let processedMessages = 0;
  let processedStatuses = 0;

  for (const parsed of messages) {
    const settings = getSettingsByPhoneNumberId(parsed.phoneNumberId);
    if (!settings) {
      console.error(
        "[whatsapp/webhook] No workspace mapped for phoneNumberId",
        parsed.phoneNumberId,
      );
      continue;
    }
    workspaceIds.add(settings.workspaceId);
    const saved = await persistInboundMessage(settings.workspaceId, parsed);
    if (saved) processedMessages += 1;
  }

  for (const status of statuses) {
    const settings = getSettingsByPhoneNumberId(status.phoneNumberId);
    if (!settings) continue;
    workspaceIds.add(settings.workspaceId);
    applyStatusUpdate({
      providerMessageId: status.providerMessageId,
      status: status.status,
      errorMessage: status.errorMessage,
    });
    processedStatuses += 1;
  }

  return {
    processedMessages,
    processedStatuses,
    workspaceIds: [...workspaceIds],
  };
}

export function verifyWhatsAppWebhookChallenge(input: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
  expectedToken: string | null;
}): { ok: true; challenge: string } | { ok: false; error: string } {
  if (input.mode !== "subscribe") {
    return { ok: false, error: "Invalid hub.mode." };
  }
  if (!input.verifyToken || !input.expectedToken) {
    return { ok: false, error: "Missing verify token." };
  }
  if (input.verifyToken !== input.expectedToken) {
    return { ok: false, error: "Verify token mismatch." };
  }
  if (!input.challenge) {
    return { ok: false, error: "Missing hub.challenge." };
  }
  return { ok: true, challenge: input.challenge };
}
