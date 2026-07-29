/**
 * Business Planner entrypoints (AI Pipeline Phase 1).
 * Prompt → BusinessPlan. Never generates a website.
 */

import { inferBusinessPlan } from "@/lib/website/ai/business-planner/engine";
import {
  completeBusinessPlanWithOpenAi,
  hasBusinessPlannerOpenAiCredentials,
} from "@/lib/website/ai/business-planner/openai";
import { BUSINESS_PLANNER_SYSTEM_PROMPT } from "@/lib/website/ai/business-planner/schema";
import type {
  BusinessPlan,
  BusinessPlannerInput,
  BusinessPlannerMeta,
  BusinessPlannerOptions,
  BusinessPlannerResult,
} from "@/lib/website/ai/business-planner/types";
import {
  parseBusinessPlan,
  parseBusinessPlanFromContent,
  toWebsitePlan,
} from "@/lib/website/ai/business-planner/validate";
import { clampAiTextByKey } from "@/lib/website/ai/helpers";

function emptyMeta(): BusinessPlannerMeta {
  return {
    usedLlm: false,
    llmFallback: false,
    provider: null,
    model: null,
    inputTokens: 0,
    outputTokens: 0,
    validationIssues: [],
  };
}

function resultFromPlan(
  plan: BusinessPlan,
  meta: BusinessPlannerMeta,
): BusinessPlannerResult {
  return {
    plan,
    website: toWebsitePlan(plan),
    meta,
  };
}

/**
 * Unit-testable planner core: validated LLM JSON → BusinessPlan,
 * or deterministic inference when signals are missing/invalid.
 */
export function resolveBusinessPlan(input: {
  prompt: string;
  llmRaw?: unknown;
  llmContent?: string | null;
}): {
  plan: BusinessPlan;
  fromLlm: boolean;
  validationIssues: Array<{ path: string; message: string }>;
} {
  const prompt = clampAiTextByKey(input.prompt, "prompt");

  if (input.llmRaw !== undefined && input.llmRaw !== null) {
    const parsed = parseBusinessPlan(input.llmRaw);
    if (parsed.ok) {
      return { plan: parsed.plan, fromLlm: true, validationIssues: [] };
    }
    return {
      plan: inferBusinessPlan(prompt),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  if (input.llmContent) {
    const parsed = parseBusinessPlanFromContent(input.llmContent);
    if (parsed.ok) {
      return { plan: parsed.plan, fromLlm: true, validationIssues: [] };
    }
    return {
      plan: inferBusinessPlan(prompt),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  return {
    plan: inferBusinessPlan(prompt),
    fromLlm: false,
    validationIssues: [],
  };
}

/**
 * Run the Business Planner.
 * Uses OpenAI when credentials exist; otherwise deterministic fallback.
 * Failures never throw for generation callers — always returns a plan.
 */
export async function planBusinessFromPrompt(
  input: BusinessPlannerInput,
  options: BusinessPlannerOptions = {},
): Promise<BusinessPlannerResult> {
  const prompt = clampAiTextByKey(input.prompt || "", "prompt");
  if (!prompt.trim()) {
    throw new Error("prompt is required.");
  }

  if (options.skipLlm) {
    return resultFromPlan(inferBusinessPlan(prompt), emptyMeta());
  }

  const completeJson = options.completeJson || completeBusinessPlanWithOpenAi;
  const hasCredentials =
    Boolean(options.completeJson) ||
    Boolean(input.apiKey?.trim()) ||
    hasBusinessPlannerOpenAiCredentials({
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
    });

  if (!hasCredentials) {
    return resultFromPlan(inferBusinessPlan(prompt), emptyMeta());
  }

  try {
    const extracted = await completeJson({
      prompt,
      systemPrompt: BUSINESS_PLANNER_SYSTEM_PROMPT,
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      model: input.model,
    });

    const resolved = resolveBusinessPlan({
      prompt,
      llmRaw: extracted.raw,
      llmContent: extracted.content,
    });

    return resultFromPlan(resolved.plan, {
      usedLlm: true,
      llmFallback: !resolved.fromLlm,
      provider: extracted.providerId,
      model: extracted.model,
      inputTokens: extracted.usage?.inputTokens ?? 0,
      outputTokens: extracted.usage?.outputTokens ?? 0,
      validationIssues: resolved.validationIssues,
    });
  } catch (error) {
    return resultFromPlan(inferBusinessPlan(prompt), {
      usedLlm: true,
      llmFallback: true,
      provider: "openai",
      model: input.model || null,
      inputTokens: 0,
      outputTokens: 0,
      validationIssues: [
        {
          path: "",
          message:
            error instanceof Error
              ? error.message
              : "Business planner LLM request failed.",
        },
      ],
    });
  }
}

/** Sync deterministic path for tests and offline use. */
export function planBusinessFromPromptSync(prompt: string): BusinessPlan {
  return inferBusinessPlan(prompt);
}
