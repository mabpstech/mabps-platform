/**
 * Website AI LLM provider registry (Sprint B3).
 * OpenAI ships now; additional models register without changing callers.
 */

import { OpenAiWebsiteLlmProvider } from "@/lib/website/ai/llm/openai";
import type {
  AiWebsiteLlmProvider,
  AiWebsiteLlmProviderId,
} from "@/lib/website/ai/llm/types";

const providers = new Map<string, AiWebsiteLlmProvider>();

function ensureDefaultsRegistered(): void {
  if (!providers.has("openai")) {
    providers.set("openai", new OpenAiWebsiteLlmProvider());
  }
}

export function registerWebsiteLlmProvider(
  provider: AiWebsiteLlmProvider,
): void {
  ensureDefaultsRegistered();
  providers.set(provider.id, provider);
}

export function getWebsiteLlmProvider(
  id: AiWebsiteLlmProviderId = "openai",
): AiWebsiteLlmProvider {
  ensureDefaultsRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown website LLM provider: ${id}`);
  }
  return provider;
}

export function listWebsiteLlmProviders(): AiWebsiteLlmProviderId[] {
  ensureDefaultsRegistered();
  return [...providers.keys()];
}
