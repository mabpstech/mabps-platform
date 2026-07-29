/**
 * OpenAI adapter for the Business Planner (AI Pipeline Phase 1).
 * Reuses website OpenAI credential resolution — returns JSON only.
 */

import { BUSINESS_PLANNER_SYSTEM_PROMPT } from "@/lib/website/ai/business-planner/schema";
import type { BusinessPlannerLlmCompleter } from "@/lib/website/ai/business-planner/types";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";
import { resolveOpenAiWebsiteConfig } from "@/lib/website/ai/llm/openai";
import { extractJsonObject } from "@/lib/website/ai/llm/validate";

export const completeBusinessPlanWithOpenAi: BusinessPlannerLlmCompleter =
  async (input) => {
    const config = resolveOpenAiWebsiteConfig({
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      model: input.model,
    });
    if (!config) {
      throw new Error(
        "OpenAI credentials are not configured for the business planner.",
      );
    }

    const prompt = clampAiTextByKey(input.prompt, "prompt");
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
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
          {
            role: "system",
            content: input.systemPrompt || BUSINESS_PLANNER_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Plan the business intent for this website prompt:\n\n${prompt}`,
          },
        ],
      }),
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
          `OpenAI business planner request failed (${response.status}).`,
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      throw new Error("OpenAI business planner returned an empty JSON response.");
    }

    const raw = extractJsonObject(content);

    return {
      content,
      raw,
      providerId: "openai",
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
  };

export function hasBusinessPlannerOpenAiCredentials(input: {
  workspaceId?: string;
  apiKey?: string;
}): boolean {
  return (
    resolveOpenAiWebsiteConfig({
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
    }) !== null
  );
}
