/**
 * AI Website Generation service (Sprint B3 + Phase 1–4 planners/generators).
 *
 * User Prompt → Business Planner → Website Planner → Generation Orchestrator →
 * (Phase 3: hero-generator via orchestrator) → OpenAI prompt signals → validate →
 * Business Intelligence → DNA → Brand Strategy → Website Plan → Creative Direction →
 * Website Composer (structure + empty Hero shell) →
 * (Phase 4: inject home Hero from generationRun; legacy shell only on failure) →
 * Blueprint Executor.
 *
 * Home Hero content has one source of truth: the Hero Generator (via orchestrator).
 * Composer never authors Hero copy. Phase 4 injects generator content; if the new
 * pipeline fails or returns no Hero, the legacy empty Composer shell is kept.
 *
 * LLM never writes Website Builder data. Validation failure falls back to
 * deterministic inference — generation must not fail because of the LLM.
 */

import {
  applyHeroToBlueprint,
  type HeroBlueprintSource,
} from "@/lib/website/ai/builder-adapter";
import { executeWebsiteBlueprint } from "@/lib/website/ai/blueprint-executor";
import { deriveBrandStrategy } from "@/lib/website/ai/brand-strategy";
import {
  planBusinessFromPrompt,
  type BusinessPlan,
  type BusinessPlannerLlmCompleter,
  type BusinessPlannerMeta,
  type WebsitePlan as PlannerWebsitePlan,
} from "@/lib/website/ai/business-planner";
import { deriveCreativeDirection } from "@/lib/website/ai/creative-director";
import { deriveBusinessDna } from "@/lib/website/ai/dna";
import { mergePromptSignalsIntoProfile } from "@/lib/website/ai/generation/merge";
import { normalizeGenerateInput } from "@/lib/website/ai/helpers";
import { analyzeBusinessPrompt } from "@/lib/website/ai/intelligence";
import {
  getWebsiteLlmProvider,
  hasOpenAiWebsiteCredentials,
  parseAiWebsitePromptSignals,
  parseAiWebsitePromptSignalsFromContent,
  type AiWebsiteLlmProvider,
  type AiWebsiteLlmProviderId,
  type AiWebsitePromptSignals,
} from "@/lib/website/ai/llm";
import type { HeroGeneratorLlmCompleter } from "@/lib/website/ai/generators/hero";
import {
  createGenerationPlan,
  runGenerationPlan,
  type GenerationPlan,
  type GenerationRunResult,
} from "@/lib/website/ai/orchestrator";
import type {
  AiBrandStrategy,
  AiBusinessDNA,
  AiBusinessProfile,
  AiCreativeDirection,
  AiWebsiteBlueprint,
  AiWebsiteGenerateInput,
  AiWebsiteGenerateResult,
  AiWebsitePlan,
} from "@/lib/website/ai/types";
import { assertAiWebsiteBlueprint } from "@/lib/website/ai/validate";
import { composeWebsite } from "@/lib/website/ai/website-composer";
import { deriveWebsitePlan } from "@/lib/website/ai/website-plan";
import {
  planWebsiteFromBusinessPlan,
  type WebsitePlan,
  type WebsitePlannerLlmCompleter,
  type WebsitePlannerMeta,
} from "@/lib/website/ai/website-planner";

export type AiWebsiteGeneratePipelineMeta = {
  usedLlm: boolean;
  llmFallback: boolean;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  validationIssues: Array<{ path: string; message: string }>;
  /** Where the persisted home Hero content came from. */
  heroSource: HeroBlueprintSource;
};

type PromptSignalsMeta = Omit<AiWebsiteGeneratePipelineMeta, "heroSource">;

export type AiWebsiteGeneratePipelineResult = AiWebsiteGenerateResult & {
  /** Phase 1 business planner output (pass-through; not yet consumed downstream). */
  businessPlan: BusinessPlan;
  /** Website structure slice of the business plan. */
  plannerWebsite: PlannerWebsitePlan;
  plannerMeta: BusinessPlannerMeta;
  /** Phase 2 website planner output (pass-through; not yet consumed downstream). */
  websitePlan: WebsitePlan;
  websitePlannerMeta: WebsitePlannerMeta;
  /** Phase 2.5 orchestrator queue. */
  generationPlan: GenerationPlan;
  /** Phase 3 orchestrator run (hero-generator only; other tasks skipped). */
  generationRun: GenerationRunResult;
  profile: AiBusinessProfile;
  dna: AiBusinessDNA;
  strategy: AiBrandStrategy;
  plan: AiWebsitePlan;
  direction: AiCreativeDirection;
  meta: AiWebsiteGeneratePipelineMeta;
};

export type AiWebsiteGenerateServiceOptions = {
  /** Prefer a registered LLM provider id (default: openai). */
  llmProviderId?: AiWebsiteLlmProviderId;
  /** Inject a provider (tests). */
  llmProvider?: AiWebsiteLlmProvider;
  /** Inject a business-planner LLM completer (tests). */
  businessPlannerCompleteJson?: BusinessPlannerLlmCompleter;
  /** Inject a website-planner LLM completer (tests). */
  websitePlannerCompleteJson?: WebsitePlannerLlmCompleter;
  /** Inject a hero-generator LLM completer (tests). */
  heroCompleteJson?: HeroGeneratorLlmCompleter;
  /** Skip LLM entirely and use deterministic inference only. */
  skipLlm?: boolean;
  /** Force an API key for the OpenAI adapter. */
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

async function extractValidatedSignals(
  prompt: string,
  workspaceId: string,
  options: AiWebsiteGenerateServiceOptions,
): Promise<{
  signals: AiWebsitePromptSignals | null;
  meta: PromptSignalsMeta;
}> {
  const emptyMeta = (): PromptSignalsMeta => ({
    usedLlm: false,
    llmFallback: false,
    provider: null,
    model: null,
    inputTokens: 0,
    outputTokens: 0,
    validationIssues: [],
  });

  if (options.skipLlm) {
    return { signals: null, meta: emptyMeta() };
  }

  const provider =
    options.llmProvider ||
    getWebsiteLlmProvider(options.llmProviderId || "openai");

  const hasCredentials =
    Boolean(options.apiKey?.trim()) ||
    Boolean(options.llmProvider) ||
    (provider.id === "openai"
      ? hasOpenAiWebsiteCredentials({
          workspaceId,
          apiKey: options.apiKey,
        })
      : true);

  if (!hasCredentials) {
    return { signals: null, meta: emptyMeta() };
  }

  try {
    const extracted = await provider.extractPromptSignals({
      prompt,
      workspaceId,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    });

    const parsed =
      extracted.raw !== undefined && extracted.raw !== null
        ? parseAiWebsitePromptSignals(extracted.raw)
        : parseAiWebsitePromptSignalsFromContent(extracted.content);

    if (!parsed.ok || !parsed.signals) {
      return {
        signals: null,
        meta: {
          usedLlm: true,
          llmFallback: true,
          provider: extracted.providerId,
          model: extracted.model,
          inputTokens: extracted.usage?.inputTokens ?? 0,
          outputTokens: extracted.usage?.outputTokens ?? 0,
          validationIssues: parsed.issues,
        },
      };
    }

    return {
      signals: parsed.signals,
      meta: {
        usedLlm: true,
        llmFallback: false,
        provider: extracted.providerId,
        model: extracted.model,
        inputTokens: extracted.usage?.inputTokens ?? 0,
        outputTokens: extracted.usage?.outputTokens ?? 0,
        validationIssues: [],
      },
    };
  } catch (error) {
    return {
      signals: null,
      meta: {
        usedLlm: true,
        llmFallback: true,
        provider: provider.id,
        model: options.model || null,
        inputTokens: 0,
        outputTokens: 0,
        validationIssues: [
          {
            path: "",
            message:
              error instanceof Error
                ? error.message
                : "LLM provider request failed.",
          },
        ],
      },
    };
  }
}

/**
 * Run the full AI website generation pipeline and persist via Blueprint Executor.
 * Never fails solely because LLM validation failed — falls back to deterministic engines.
 */
export async function generateWebsiteFromPrompt(
  input: AiWebsiteGenerateInput,
  options: AiWebsiteGenerateServiceOptions = {},
): Promise<AiWebsiteGeneratePipelineResult> {
  const normalized = normalizeGenerateInput(input);
  if (!normalized.workspaceId) {
    throw new Error("workspaceId is required.");
  }
  if (!normalized.prompt.trim()) {
    throw new Error("prompt is required.");
  }

  // 0. Business Planner (Phase 1) — understand prompt; log + pass through only
  const plannerResult = await planBusinessFromPrompt(
    {
      prompt: normalized.prompt,
      workspaceId: normalized.workspaceId,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    },
    {
      skipLlm: options.skipLlm,
      completeJson: options.businessPlannerCompleteJson,
    },
  );
  console.info("[ai/business-planner]", {
    prompt: normalized.prompt,
    plan: plannerResult.plan,
    meta: plannerResult.meta,
  });

  // 0b. Website Planner (Phase 2) — structure only; log + pass through only
  const websitePlannerResult = await planWebsiteFromBusinessPlan(
    {
      businessPlan: plannerResult.plan,
      prompt: normalized.prompt,
      workspaceId: normalized.workspaceId,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    },
    {
      skipLlm: options.skipLlm,
      completeJson: options.websitePlannerCompleteJson,
    },
  );
  console.info("[ai/website-planner]", {
    businessPlan: plannerResult.plan,
    plan: websitePlannerResult.plan,
    meta: websitePlannerResult.meta,
  });

  // 0c. Generation Orchestrator (Phase 2.5–3) — queue + hero-generator dispatch
  const generationPlan = createGenerationPlan({
    businessPlan: plannerResult.plan,
    websitePlan: websitePlannerResult.plan,
  });
  console.info("[ai/orchestrator]", {
    businessPlan: plannerResult.plan,
    websitePlan: websitePlannerResult.plan,
    generationPlan,
  });

  // Hero Generator is the sole content author for home Hero. On failure, keep
  // the legacy Composer shell later in Phase 4 (do not abort site generation).
  let generationRun: GenerationRunResult;
  try {
    generationRun = await runGenerationPlan(
      {
        businessPlan: plannerResult.plan,
        websitePlan: websitePlannerResult.plan,
        plan: generationPlan,
        workspaceId: normalized.workspaceId,
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        model: options.model,
      },
      {
        skipLlm: options.skipLlm,
        heroCompleteJson: options.heroCompleteJson,
      },
    );
  } catch (error) {
    console.info("[ai/hero] Hero fallback used", {
      reason: "new pipeline failed",
      message:
        error instanceof Error
          ? error.message
          : "Hero generation pipeline threw.",
    });
    generationRun = {
      plan: generationPlan,
      results: [],
      hero: null,
      heroMeta: null,
    };
  }

  const { signals, meta: signalsMeta } = await extractValidatedSignals(
    normalized.prompt,
    normalized.workspaceId,
    options,
  );

  // 1. Business Intelligence (deterministic engine always runs)
  const bi = await analyzeBusinessPrompt({
    prompt: normalized.prompt,
    options: normalized.options,
  });
  const profile = mergePromptSignalsIntoProfile(bi.profile, signals);

  // 2. Business DNA
  const dnaResult = await deriveBusinessDna({ profile });
  const dna = dnaResult.dna;

  // 3. Brand Strategy
  const strategyResult = await deriveBrandStrategy({ dna });
  const strategy = strategyResult.strategy;

  // 4. Website Plan
  const planResult = await deriveWebsitePlan({ profile, dna, strategy });
  const plan = planResult.plan;

  // 5. Creative Direction
  const directionResult = await deriveCreativeDirection({
    dna,
    strategy,
    plan,
  });
  const direction = directionResult.direction;

  // 6. Website Composer — structure only; home Hero text fields stay empty
  const composed = await composeWebsite({
    profile,
    dna,
    strategy,
    plan,
    prompt: normalized.prompt,
    options: normalized.options,
  });

  // 7. Phase 4 — inject Hero Generator content (legacy shell only if missing)
  const heroApply = applyHeroToBlueprint(composed.blueprint, generationRun);
  const blueprint: AiWebsiteBlueprint = heroApply.blueprint;
  assertAiWebsiteBlueprint(blueprint);

  const meta: AiWebsiteGeneratePipelineMeta = {
    ...signalsMeta,
    heroSource: heroApply.source,
  };

  // 8. Blueprint Executor → Website Builder (persists injected Hero)
  const executed = executeWebsiteBlueprint({
    workspaceId: normalized.workspaceId,
    blueprint,
  });

  return {
    siteId: executed.siteId,
    blueprint,
    businessPlan: plannerResult.plan,
    plannerWebsite: plannerResult.website,
    plannerMeta: plannerResult.meta,
    websitePlan: websitePlannerResult.plan,
    websitePlannerMeta: websitePlannerResult.meta,
    generationPlan,
    generationRun,
    profile,
    dna,
    strategy,
    plan,
    direction,
    meta,
  };
}
