/**
 * AI Website Generation service (Sprint B3).
 *
 * User Prompt → OpenAI (structured JSON) → validate →
 * Business Intelligence → DNA → Brand Strategy → Website Plan →
 * Creative Direction → Website Composer → Blueprint Executor.
 *
 * LLM never writes Website Builder data. Validation failure falls back to
 * deterministic inference — generation must not fail because of the LLM.
 */

import { executeWebsiteBlueprint } from "@/lib/website/ai/blueprint-executor";
import { deriveBrandStrategy } from "@/lib/website/ai/brand-strategy";
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

export type AiWebsiteGeneratePipelineMeta = {
  usedLlm: boolean;
  llmFallback: boolean;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  validationIssues: Array<{ path: string; message: string }>;
};

export type AiWebsiteGeneratePipelineResult = AiWebsiteGenerateResult & {
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
  meta: AiWebsiteGeneratePipelineMeta;
}> {
  const emptyMeta = (): AiWebsiteGeneratePipelineMeta => ({
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

  const { signals, meta } = await extractValidatedSignals(
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

  // 6. Website Composer (deterministic blueprint — never from LLM)
  const composed = await composeWebsite({
    profile,
    dna,
    strategy,
    plan,
    prompt: normalized.prompt,
    options: normalized.options,
  });
  const blueprint: AiWebsiteBlueprint = composed.blueprint;
  assertAiWebsiteBlueprint(blueprint);

  // 7. Blueprint Executor → Website Builder
  const executed = executeWebsiteBlueprint({
    workspaceId: normalized.workspaceId,
    blueprint,
  });

  return {
    siteId: executed.siteId,
    blueprint,
    profile,
    dna,
    strategy,
    plan,
    direction,
    meta,
  };
}
