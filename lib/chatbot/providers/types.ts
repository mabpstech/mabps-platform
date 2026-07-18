import type { AiChatMessage, AiChatResult, AiProviderId } from "@/lib/chatbot/types";

export type AiProviderConfig = {
  provider: AiProviderId;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  temperature?: number;
};

export interface AiProvider {
  id: AiProviderId;
  chat(
    messages: AiChatMessage[],
    config: AiProviderConfig,
  ): Promise<AiChatResult>;
}
