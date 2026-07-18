import type { ChannelProvider } from "@/lib/chatbot/channels/types";

export const widgetChannelProvider: ChannelProvider = {
  id: "widget",
  isImplemented: true,
  async sendMessage(_connectionConfig, message) {
    // Widget delivery is pull/push over HTTP; no external send required.
    return {
      ok: true,
      externalMessageId: message.conversationId,
    };
  },
};
