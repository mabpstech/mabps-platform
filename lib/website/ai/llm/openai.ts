/**
 * OpenAI provider adapter for website AI prompt signals (Sprint B3).
 * Returns structured JSON only — never Website Builder data.
 */

import { DEFAULT_AI_MODEL } from "@/lib/ai/defaults";
import { resolveProviderCredential } from "@/lib/ai/repository";
import { fetchWithTimeout } from "@/lib/platform/fetch-timeout";
import { AI_WEBSITE_LLM_SYSTEM_PROMPT } from "@/lib/website/ai/llm/schema";
import { extractJsonObject } from "@/lib/website/ai/llm/validate";
import type {
  AiWebsiteLlmExtractInput,
  AiWebsiteLlmExtractResult,
  AiWebsiteLlmProvider,
} from "@/lib/website/ai/llm/types";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";

/** Shared OpenAI credential resolution for website AI adapters. */
export function resolveOpenAiWebsiteConfig(input: {
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
}): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  return resolveOpenAiConfig({
    prompt: "",
    workspaceId: input.workspaceId,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    model: input.model,
  });
}

function resolveOpenAiConfig(input: AiWebsiteLlmExtractInput): {
  apiKey: string;
  baseUrl: string;
  model: string;
} | null {
  if (input.apiKey?.trim()) {
    return {
      apiKey: input.apiKey.trim(),
      baseUrl: (input.baseUrl || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: input.model?.trim() || DEFAULT_AI_MODEL.openai,
    };
  }

  if (input.workspaceId) {
    const credential = resolveProviderCredential(input.workspaceId, "openai");
    if (credential?.apiKey) {
      return {
        apiKey: credential.apiKey,
        baseUrl: (credential.baseUrl || "https://api.openai.com/v1").replace(
          /\/$/,
          "",
        ),
        model:
          input.model?.trim() ||
          credential.defaultModel ||
          DEFAULT_AI_MODEL.openai,
      };
    }
  }

  const envKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.MABPS_OPENAI_API_KEY?.trim();
  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: (
        process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
      ).replace(/\/$/, ""),
      model: input.model?.trim() || DEFAULT_AI_MODEL.openai,
    };
  }

  return null;
}

export class OpenAiWebsiteLlmProvider implements AiWebsiteLlmProvider {
  readonly id = "openai" as const;

  async extractPromptSignals(
    input: AiWebsiteLlmExtractInput,
  ): Promise<AiWebsiteLlmExtractResult> {
    const config = resolveOpenAiConfig(input);
    if (!config) {
      throw new Error(
        "OpenAI credentials are not configured for website generation.",
      );
    }

    const prompt = clampAiTextByKey(input.prompt, "prompt");
    const response = await fetchWithTimeout(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AI_WEBSITE_LLM_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract website business signals from this prompt:\n\n${prompt}`,
          },
        ],
      }),
      timeoutMs: 60_000,
    });

    const data = (await response.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string | null } }>;
      model?: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    if (!response.ok) {
      throw new Error(
        data.error?.message ||
          `OpenAI website signal request failed (${response.status}).`,
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      throw new Error("OpenAI returned an empty JSON response.");
    }

    const raw = extractJsonObject(content);

    return {
      raw,
      content,
      providerId: this.id,
      model: data.model || config.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        totalTokens:
          data.usage?.total_tokens ??
          (data.usage?.prompt_tokens ?? 0) +
            (data.usage?.completion_tokens ?? 0),
      },
    };
  }
}

export function hasOpenAiWebsiteCredentials(input: {
  workspaceId?: string;
  apiKey?: string;
}): boolean {
  return (
    resolveOpenAiConfig({
      prompt: "",
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
    }) !== null
  );
}
