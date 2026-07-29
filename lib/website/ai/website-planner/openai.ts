/**
 * OpenAI adapter for the Website Planner (AI Pipeline Phase 2).
 * Reuses website OpenAI credential resolution — returns JSON only.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import { WEBSITE_PLANNER_SYSTEM_PROMPT } from "@/lib/website/ai/website-planner/schema";
import type { WebsitePlannerLlmCompleter } from "@/lib/website/ai/website-planner/types";
import { resolveOpenAiWebsiteConfig } from "@/lib/website/ai/llm/openai";
import { extractJsonObject } from "@/lib/website/ai/llm/validate";

function buildUserMessage(businessPlan: BusinessPlan, prompt?: string): string {
  const parts = [
    "Plan the website structure for this BusinessPlan.",
    "Return structure only — no copy, HTML, components, colours, or typography.",
    "",
    "BusinessPlan JSON:",
    JSON.stringify(businessPlan, null, 2),
  ];
  if (prompt?.trim()) {
    parts.push("", "Original user prompt (context only):", prompt.trim());
  }
  return parts.join("\n");
}

export const completeWebsitePlanWithOpenAi: WebsitePlannerLlmCompleter = async (
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
      "OpenAI credentials are not configured for the website planner.",
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
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: input.systemPrompt || WEBSITE_PLANNER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildUserMessage(input.businessPlan, input.prompt),
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
        `OpenAI website planner request failed (${response.status}).`,
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim() || "";
  if (!content) {
    throw new Error("OpenAI website planner returned an empty JSON response.");
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

export function hasWebsitePlannerOpenAiCredentials(input: {
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
