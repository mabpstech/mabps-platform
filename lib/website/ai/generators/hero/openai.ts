/**
 * OpenAI adapter for the Hero generator (AI Pipeline Phase 3).
 * Reuses website OpenAI credential resolution — returns JSON only.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";
import { HERO_GENERATOR_SYSTEM_PROMPT } from "@/lib/website/ai/generators/hero/schema";
import type { HeroGeneratorLlmCompleter } from "@/lib/website/ai/generators/hero/types";
import { resolveOpenAiWebsiteConfig } from "@/lib/website/ai/llm/openai";
import { extractJsonObject } from "@/lib/website/ai/llm/validate";

function buildUserMessage(input: {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
  task: GenerationTask;
}): string {
  return [
    "Generate structured content for ONE Hero section.",
    "Return JSON only — no HTML, JSX, CSS, or components.",
    "",
    "GenerationTask JSON:",
    JSON.stringify(input.task, null, 2),
    "",
    "BusinessPlan JSON:",
    JSON.stringify(input.businessPlan, null, 2),
    "",
    "WebsitePlan JSON (structure context only):",
    JSON.stringify(input.websitePlan, null, 2),
  ].join("\n");
}

export const completeHeroWithOpenAi: HeroGeneratorLlmCompleter = async (
  input,
) => {
  const config = resolveOpenAiWebsiteConfig({
    workspaceId: input.workspaceId,
    apiKey: input.apiKey,
    baseUrl: input.baseUrl,
    model: input.model,
  });
  if (!config) {
    throw new Error(
      "OpenAI credentials are not configured for the hero generator.",
    );
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: input.systemPrompt || HERO_GENERATOR_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildUserMessage({
            businessPlan: input.businessPlan,
            websitePlan: input.websitePlan,
            task: input.task,
          }),
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
        `OpenAI hero generator request failed (${response.status}).`,
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) {
    throw new Error("OpenAI hero generator returned an empty JSON response.");
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

export function hasHeroGeneratorOpenAiCredentials(input: {
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
