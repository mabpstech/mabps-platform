import { apiChannelProvider } from "@/lib/chatbot/channels/api";
import type { ChannelProvider } from "@/lib/chatbot/channels/types";
import { whatsappChannelProvider } from "@/lib/chatbot/channels/whatsapp";
import { widgetChannelProvider } from "@/lib/chatbot/channels/widget";
import type { ChatChannel } from "@/lib/chatbot/types";

const channels: Record<ChatChannel, ChannelProvider> = {
  widget: widgetChannelProvider,
  whatsapp: whatsappChannelProvider,
  api: apiChannelProvider,
};

export function getChannelProvider(channel: ChatChannel): ChannelProvider {
  return channels[channel];
}

export type {
  ChannelInboundMessage,
  ChannelProvider,
  ChannelSendResult,
} from "@/lib/chatbot/channels/types";
