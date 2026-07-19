import type {
  ChannelInboundMessage,
  ChannelProvider,
  ChannelSendResult,
} from "@/lib/chatbot/channels/types";
import { parseWhatsAppWebhookPayload } from "@/lib/whatsapp/engine/parse";
import { sendWhatsAppText } from "@/lib/whatsapp/engine/outbound";
import {
  ensureWorkspaceWhatsApp,
  getSettingsByPhoneNumberId,
  getWhatsAppSettings,
} from "@/lib/whatsapp/repository";

/**
 * WhatsApp Cloud API channel adapter.
 * Credentials live in the WhatsApp Integration module; channel config may
 * optionally override phoneNumberId / accessToken for a specific bot.
 */
export const whatsappChannelProvider: ChannelProvider = {
  id: "whatsapp",
  isImplemented: true,
  async sendMessage(connectionConfig, message): Promise<ChannelSendResult> {
    let workspaceId =
      typeof connectionConfig.workspaceId === "string"
        ? connectionConfig.workspaceId
        : null;
    if (
      !workspaceId &&
      typeof connectionConfig.phoneNumberId === "string"
    ) {
      workspaceId =
        getSettingsByPhoneNumberId(connectionConfig.phoneNumberId)
          ?.workspaceId || null;
    }
    if (!workspaceId) {
      return {
        ok: false,
        raw: { error: "workspaceId is required in WhatsApp channel config." },
      };
    }

    ensureWorkspaceWhatsApp(workspaceId);
    const settings = getWhatsAppSettings(workspaceId);
    const to =
      message.externalThreadId ||
      (typeof connectionConfig.to === "string" ? connectionConfig.to : "");
    if (!to) {
      return { ok: false, raw: { error: "Missing WhatsApp recipient." } };
    }

    try {
      // Keep settings connected when channel config supplies credentials.
      if (
        typeof connectionConfig.accessToken === "string" &&
        typeof connectionConfig.phoneNumberId === "string"
      ) {
        const { updateWhatsAppSettings } = await import(
          "@/lib/whatsapp/repository"
        );
        updateWhatsAppSettings(workspaceId, {
          phoneNumberId: connectionConfig.phoneNumberId,
          accessToken: connectionConfig.accessToken,
          wabaId:
            typeof connectionConfig.wabaId === "string"
              ? connectionConfig.wabaId
              : settings?.wabaId,
          isConnected: true,
        });
      }

      const sent = await sendWhatsAppText({
        workspaceId,
        to,
        text: message.content,
      });
      return {
        ok: sent.status !== "failed",
        externalMessageId: sent.providerMessageId || undefined,
        raw: sent.raw,
      };
    } catch (error) {
      return {
        ok: false,
        raw: {
          error:
            error instanceof Error ? error.message : "WhatsApp send failed.",
        },
      };
    }
  },
  parseInbound(payload): ChannelInboundMessage | ChannelInboundMessage[] | null {
    const { messages } = parseWhatsAppWebhookPayload(payload);
    if (!messages.length) return null;
    return messages.map((message) => ({
      externalThreadId: message.waId,
      content: message.content || `[${message.type}]`,
      visitorName: message.profileName,
      visitorPhone: message.phone.startsWith("+")
        ? message.phone
        : `+${message.phone}`,
      metadata: {
        providerMessageId: message.providerMessageId,
        type: message.type,
        mediaId: message.mediaId,
        phoneNumberId: message.phoneNumberId,
        raw: message.raw,
      },
    }));
  },
};
