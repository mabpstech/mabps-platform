import type { ChannelOutboundMessage, ChatChannel } from "@/lib/chatbot/types";

export type ChannelInboundMessage = {
  externalThreadId: string;
  content: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  metadata?: Record<string, unknown>;
};

export type ChannelSendResult = {
  ok: boolean;
  externalMessageId?: string;
  raw?: unknown;
};

/**
 * Channel providers keep Chatbot API-first and channel-agnostic.
 * WhatsApp Cloud API is intentionally stubbed for a later Integrations pass.
 */
export interface ChannelProvider {
  id: ChatChannel;
  isImplemented: boolean;
  sendMessage(
    connectionConfig: Record<string, unknown>,
    message: ChannelOutboundMessage,
  ): Promise<ChannelSendResult>;
  parseInbound?(
    payload: unknown,
  ): ChannelInboundMessage | ChannelInboundMessage[] | null;
}
