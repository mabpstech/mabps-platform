/**
 * Hero generator entrypoints (AI Pipeline Phase 3).
 * BusinessPlan + WebsitePlan + GenerationTask → HeroSectionContent.
 * Structured content only — never HTML, JSX, CSS, or components.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";
import { inferHeroSection } from "@/lib/website/ai/generators/hero/engine";
import {
  completeHeroWithOpenAi,
  hasHeroGeneratorOpenAiCredentials,
} from "@/lib/website/ai/generators/hero/openai";
import { HERO_GENERATOR_SYSTEM_PROMPT } from "@/lib/website/ai/generators/hero/schema";
import type {
  HeroGeneratorInput,
  HeroGeneratorMeta,
  HeroGeneratorOptions,
  HeroGeneratorResult,
  HeroSectionContent,
} from "@/lib/website/ai/generators/hero/types";
import {
  parseHeroSection,
  parseHeroSectionFromContent,
} from "@/lib/website/ai/generators/hero/validate";

function emptyMeta(): HeroGeneratorMeta {
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

function resultFromContent(
  content: HeroSectionContent,
  meta: HeroGeneratorMeta,
): HeroGeneratorResult {
  return { content, meta };
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

function assertWebsitePlan(plan: WebsitePlan | undefined): WebsitePlan {
  if (!plan || typeof plan !== "object") {
    throw new Error("websitePlan is required.");
  }
  if (!Array.isArray(plan.pages)) {
    throw new Error("websitePlan.pages is required.");
  }
  return plan;
}

function assertHeroTask(task: GenerationTask | undefined): GenerationTask {
  if (!task || typeof task !== "object") {
    throw new Error("task is required.");
  }
  if (!task.page?.trim() || !task.section?.trim() || !task.generator?.trim()) {
    throw new Error("task must include page, section, and generator.");
  }
  if (task.generator !== "hero-generator") {
    throw new Error(
      `hero generator requires generator "hero-generator", got "${task.generator}".`,
    );
  }
  return task;
}

/**
 * Unit-testable core: validated LLM JSON → HeroSectionContent,
 * or deterministic inference when signals are missing/invalid.
 */
export function resolveHeroSection(input: {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
  task: GenerationTask;
  llmRaw?: unknown;
  llmContent?: string | null;
}): {
  content: HeroSectionContent;
  fromLlm: boolean;
  validationIssues: Array<{ path: string; message: string }>;
} {
  const businessPlan = assertBusinessPlan(input.businessPlan);
  const websitePlan = assertWebsitePlan(input.websitePlan);
  const task = assertHeroTask(input.task);
  const fallback = () =>
    inferHeroSection({ businessPlan, websitePlan, task });

  if (input.llmRaw !== undefined && input.llmRaw !== null) {
    const parsed = parseHeroSection(input.llmRaw);
    if (parsed.ok) {
      return { content: parsed.content, fromLlm: true, validationIssues: [] };
    }
    return {
      content: fallback(),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  if (input.llmContent) {
    const parsed = parseHeroSectionFromContent(input.llmContent);
    if (parsed.ok) {
      return { content: parsed.content, fromLlm: true, validationIssues: [] };
    }
    return {
      content: fallback(),
      fromLlm: false,
      validationIssues: parsed.issues,
    };
  }

  return {
    content: fallback(),
    fromLlm: false,
    validationIssues: [],
  };
}

/**
 * Generate structured content for a single Hero section.
 * Uses OpenAI when credentials exist; otherwise deterministic fallback.
 * Failures never throw for generation callers — always returns content.
 */
export async function generateHero(
  input: HeroGeneratorInput,
  options: HeroGeneratorOptions = {},
): Promise<HeroGeneratorResult> {
  const businessPlan = assertBusinessPlan(input.businessPlan);
  const websitePlan = assertWebsitePlan(input.websitePlan);
  const task = assertHeroTask(input.task);

  if (options.skipLlm) {
    return resultFromContent(
      inferHeroSection({ businessPlan, websitePlan, task }),
      emptyMeta(),
    );
  }

  const completeJson = options.completeJson || completeHeroWithOpenAi;
  const hasCredentials =
    Boolean(options.completeJson) ||
    Boolean(input.apiKey?.trim()) ||
    hasHeroGeneratorOpenAiCredentials({
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
    });

  if (!hasCredentials) {
    return resultFromContent(
      inferHeroSection({ businessPlan, websitePlan, task }),
      emptyMeta(),
    );
  }

  try {
    const extracted = await completeJson({
      businessPlan,
      websitePlan,
      task,
      systemPrompt: HERO_GENERATOR_SYSTEM_PROMPT,
      workspaceId: input.workspaceId,
      apiKey: input.apiKey,
      baseUrl: input.baseUrl,
      model: input.model,
    });

    const resolved = resolveHeroSection({
      businessPlan,
      websitePlan,
      task,
      llmRaw: extracted.raw,
      llmContent: extracted.content,
    });

    return resultFromContent(resolved.content, {
      usedLlm: true,
      llmFallback: !resolved.fromLlm,
      provider: extracted.providerId,
      model: extracted.model,
      inputTokens: extracted.usage?.inputTokens ?? 0,
      outputTokens: extracted.usage?.outputTokens ?? 0,
      validationIssues: resolved.validationIssues,
    });
  } catch (error) {
    return resultFromContent(
      inferHeroSection({ businessPlan, websitePlan, task }),
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
                : "Hero generator LLM request failed.",
          },
        ],
      },
    );
  }
}

/** Sync deterministic path for tests and offline use. */
export function generateHeroSync(
  businessPlan: BusinessPlan,
  websitePlan: WebsitePlan,
  task: GenerationTask,
): HeroSectionContent {
  assertBusinessPlan(businessPlan);
  assertWebsitePlan(websitePlan);
  assertHeroTask(task);
  return inferHeroSection({ businessPlan, websitePlan, task });
}
