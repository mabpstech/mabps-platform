import { DEFAULT_BOT_MODEL } from "@/lib/chatbot/defaults";
import { geminiProvider } from "@/lib/chatbot/providers/gemini";
import { openaiProvider } from "@/lib/chatbot/providers/openai";
import { openrouterProvider } from "@/lib/chatbot/providers/openrouter";
import type {
  AiProvider,
  AiProviderConfig,
} from "@/lib/chatbot/providers/types";
import type { AiChatMessage, AiChatResult, AiProviderId } from "@/lib/chatbot/types";

const providers: Record<AiProviderId, AiProvider> = {
  openai: openaiProvider,
  gemini: geminiProvider,
  openrouter: openrouterProvider,
};

export function getAiProvider(provider: AiProviderId): AiProvider {
  const impl = providers[provider];
  if (!impl) {
    throw new Error(`Unknown AI provider: ${provider}`);
  }
  return impl;
}

export function defaultModelForProvider(provider: AiProviderId): string {
  return DEFAULT_BOT_MODEL[provider] || DEFAULT_BOT_MODEL.openai;
}

export async function runAiChat(
  messages: AiChatMessage[],
  config: AiProviderConfig,
): Promise<AiChatResult> {
  const provider = getAiProvider(config.provider);
  return provider.chat(messages, {
    ...config,
    model: config.model || defaultModelForProvider(config.provider),
  });
}

export type { AiProvider, AiProviderConfig };
