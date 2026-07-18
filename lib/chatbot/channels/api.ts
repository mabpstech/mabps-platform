import type { ChannelProvider } from "@/lib/chatbot/channels/types";

export const apiChannelProvider: ChannelProvider = {
  id: "api",
  isImplemented: true,
  async sendMessage(_connectionConfig, message) {
    return {
      ok: true,
      externalMessageId: message.conversationId,
    };
  },
};
