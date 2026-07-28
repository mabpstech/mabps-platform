/**
 * Website AI LLM layer (Sprint B3).
 * Structured JSON providers + validation — no Website Builder writes.
 */

export {
  AI_WEBSITE_LLM_FORBIDDEN_KEYS,
  AI_WEBSITE_LLM_SYSTEM_PROMPT,
  AI_WEBSITE_PROMPT_SIGNAL_KEYS,
  buildPromptSignalsJsonSchemaPrompt,
  type AiWebsitePromptSignalKey,
} from "@/lib/website/ai/llm/schema";

export {
  AI_WEBSITE_LLM_PROVIDER_IDS,
  type AiWebsiteLlmExtractInput,
  type AiWebsiteLlmExtractResult,
  type AiWebsiteLlmParseResult,
  type AiWebsiteLlmProvider,
  type AiWebsiteLlmProviderId,
  type AiWebsitePromptSignals,
} from "@/lib/website/ai/llm/types";

export {
  extractJsonObject,
  parseAiWebsitePromptSignals,
  parseAiWebsitePromptSignalsFromContent,
} from "@/lib/website/ai/llm/validate";

export {
  OpenAiWebsiteLlmProvider,
  hasOpenAiWebsiteCredentials,
} from "@/lib/website/ai/llm/openai";

export {
  getWebsiteLlmProvider,
  listWebsiteLlmProviders,
  registerWebsiteLlmProvider,
} from "@/lib/website/ai/llm/provider";
