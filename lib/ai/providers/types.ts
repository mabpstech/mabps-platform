import type {
  AiChatMessage,
  AiChatResult,
  AiProviderId,
  AiStreamChunk,
  AiToolDefinition,
} from "@/lib/ai/types";

export type AiProviderConfig = {
  provider: AiProviderId;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  temperature?: number;
  tools?: AiToolDefinition[];
};

export interface AiProvider {
  id: AiProviderId;
  chat(
    messages: AiChatMessage[],
    config: AiProviderConfig,
  ): Promise<AiChatResult>;
  chatStream?(
    messages: AiChatMessage[],
    config: AiProviderConfig,
  ): AsyncGenerator<AiStreamChunk, void, unknown>;
}
