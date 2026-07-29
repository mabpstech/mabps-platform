/**
 * Website Planner entrypoints (AI Pipeline Phase 2).
 * BusinessPlan → WebsitePlan. Structure only — never generates a website.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import { inferWebsitePlanFromBusinessPlan } from "@/lib/website/ai/website-planner/engine";
import {
  completeWebsitePlanWithOpenAi,
  hasWebsitePlannerOpenAiCredentials,
} from "@/lib/website/ai/website-planner/openai";
import { WEBSITE_PLANNER_SYSTEM_PROMPT } from "@/lib/website/ai/website-planner/schema";
import type {
  WebsitePlan,
  WebsitePlannerInput,
  WebsitePlannerMeta,
  WebsitePlannerOptions,
  WebsitePlannerResult,
} from "@/lib/website/ai/website-planner/types";
import {
  parseWebsitePlan,
  parseWebsitePlanFromContent,
} from "@/lib/website/ai/website-planner/validate";

function emptyMeta(): WebsitePlannerMeta {
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
  plan: WebsitePlan,
  meta: WebsitePlannerMeta,
): WebsitePlannerResult {
  return { plan, meta };
}

function assertBusinessPlan(plan: BusinessPlan | undefined): BusinessPlan {
  if (!plan || typeof plan !== "object") {
    throw new Error("businessPlan is required.");
  }
  if (!plan.businessType?.trim() || !plan.industry?.trim()) {
    throw new Error("businessPlan must include businessType and industry.");
  }
  return plan;
}

/**
 * Unit-testable planner core: validated LLM JSON → WebsitePlan,
 * or deterministic inference when signals are missing/invalid.
 */
export function resolveWebsiteStructurePlan(input: {
  businessPlan: BusinessPlan;
  prompt?: string;
  llmRaw?: unknown;
  llmContent?: string | null;
}): {
  plan: WebsitePlan;
  fromLlm: boolean;
  validationIssues: Array<{ path: string; message: string }>;
} {
  const businessPlan = assertBusinessPlan(input.businessPlan);
  const prompt = input.prompt || "";

  if (input.llmRaw !== undefined && input.llmRaw !== null) {
    const parsed = parseWebsitePlan(input.llmRaw);
    if (parsed.ok) {
      return { plan: parsed.plan, fromLlm: true, validationIssues: [] };
    }
    return {
      plan: inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  if (input.llmContent) {
    const parsed = parseWebsitePlanFromContent(input.llmContent);
    if (parsed.ok) {
      return { plan: parsed.plan, fromLlm: true, validationIssues: [] };
    }
    return {
      plan: inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  return {
    plan: inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
    fromLlm: false,
    validationIssues: [],
  };
}

/**
 * Run the Website Planner.
 * Uses OpenAI when credentials exist; otherwise deterministic fallback.
 * Failures never throw for generation callers — always returns a plan.
 */
export async function planWebsiteFromBusinessPlan(
  input: WebsitePlannerInput,
  options: WebsitePlannerOptions = {},
): Promise<WebsitePlannerResult> {
  const businessPlan = assertBusinessPlan(input.businessPlan);
  const prompt = input.prompt || "";

  if (options.skipLlm) {
    return resultFromPlan(
      inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
      emptyMeta(),
    );
  }

  const completeJson = options.completeJson || completeWebsitePlanWithOpenAi;
  const hasCredentials =
    Boolean(options.completeJson) ||
    Boolean(input.apiKey?.trim()) ||
    hasWebsitePlannerOpenAiCredentials({
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
    });

  if (!hasCredentials) {
    return resultFromPlan(
      inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
      emptyMeta(),
    );
  }

  try {
    const extracted = await completeJson({
      businessPlan,
      prompt,
      systemPrompt: WEBSITE_PLANNER_SYSTEM_PROMPT,
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      model: input.model,
    });

    const resolved = resolveWebsiteStructurePlan({
      businessPlan,
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
    return resultFromPlan(
      inferWebsitePlanFromBusinessPlan(businessPlan, prompt),
      {
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
                : "Website planner LLM request failed.",
          },
        ],
      },
    );
  }
}

/** Sync deterministic path for tests and offline use. */
export function planWebsiteFromBusinessPlanSync(
  businessPlan: BusinessPlan,
  prompt = "",
): WebsitePlan {
  return inferWebsitePlanFromBusinessPlan(businessPlan, prompt);
}
