import { DEFAULT_AI_MODEL } from "@/lib/ai/defaults";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { openrouterProvider } from "@/lib/ai/providers/openrouter";
import type {
  AiProvider,
  AiProviderConfig,
} from "@/lib/ai/providers/types";
import type {
  AiChatMessage,
  AiChatResult,
  AiProviderId,
  AiStreamChunk,
} from "@/lib/ai/types";

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
  return DEFAULT_AI_MODEL[provider] || DEFAULT_AI_MODEL.openai;
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

export async function* streamAiChat(
  messages: AiChatMessage[],
  config: AiProviderConfig,
): AsyncGenerator<AiStreamChunk, void, unknown> {
  const provider = getAiProvider(config.provider);
  const resolved = {
    ...config,
    model: config.model || defaultModelForProvider(config.provider),
  };
  if (provider.chatStream) {
    yield* provider.chatStream(messages, resolved);
    return;
  }

  try {
    const result = await provider.chat(messages, resolved);
    if (result.content) {
      yield { type: "delta", text: result.content };
    }
    if (result.toolCalls?.length) {
      yield { type: "tool_calls", toolCalls: result.toolCalls };
    }
    yield {
      type: "done",
      content: result.content,
      model: result.model,
      usage: result.usage,
      toolCalls: result.toolCalls,
    };
  } catch (error) {
    yield {
      type: "error",
      message:
        error instanceof Error ? error.message : "AI provider request failed.",
    };
  }
}

export type { AiProvider, AiProviderConfig };
