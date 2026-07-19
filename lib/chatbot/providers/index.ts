/**
 * Chatbot LLM facade — HTTP adapters live in `lib/ai/providers` (canonical).
 * Credential storage and bot defaults remain chatbot-owned.
 */
import { DEFAULT_AI_MODEL } from "@/lib/ai/defaults";
import {
  getAiProvider,
  runAiChat as runSharedAiChat,
} from "@/lib/ai/providers";
import type { AiProviderConfig as SharedProviderConfig } from "@/lib/ai/providers/types";
import type {
  AiChatMessage as SharedChatMessage,
  AiProviderId,
} from "@/lib/ai/types";
import type { AiChatMessage, AiChatResult } from "@/lib/chatbot/types";

export type AiProviderConfig = {
  provider: AiProviderId;
  apiKey: string;
  baseUrl?: string | null;
  model: string;
  temperature?: number;
  appTitle?: string;
};

export { getAiProvider };
export type { AiProvider } from "@/lib/ai/providers/types";

export function defaultModelForProvider(provider: AiProviderId): string {
  return DEFAULT_AI_MODEL[provider] || DEFAULT_AI_MODEL.openai;
}

export async function runAiChat(
  messages: AiChatMessage[],
  config: AiProviderConfig,
): Promise<AiChatResult> {
  const sharedConfig: SharedProviderConfig = {
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model || defaultModelForProvider(config.provider),
    temperature: config.temperature,
    appTitle: config.appTitle || "MABPS Chatbot",
  };

  const result = await runSharedAiChat(
    messages as SharedChatMessage[],
    sharedConfig,
  );

  return {
    content: result.content,
    provider: result.provider,
    model: result.model,
  };
}
