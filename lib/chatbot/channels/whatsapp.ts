import type { ChannelProvider } from "@/lib/chatbot/channels/types";

/**
 * WhatsApp-ready channel adapter.
 * Config shape is reserved for Meta WhatsApp Cloud API credentials
 * (phoneNumberId, accessToken, verifyToken, wabaId) — not wired yet.
 */
export const whatsappChannelProvider: ChannelProvider = {
  id: "whatsapp",
  isImplemented: false,
  async sendMessage() {
    throw new Error(
      "WhatsApp Cloud API is not implemented yet. Channel provider interface is ready.",
    );
  },
  parseInbound() {
    throw new Error(
      "WhatsApp Cloud API inbound parsing is not implemented yet.",
    );
  },
};
