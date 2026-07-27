/**
 * Business Intelligence Layer contracts (Sprint C2).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type {
  AiBusinessProfile,
  AiGenerationOptions,
} from "@/lib/website/ai/types";

/** Below this score, leave the field null/empty instead of guessing. */
export const AI_CONFIDENCE_THRESHOLD = 0.5;

export const AI_BUSINESS_INTELLIGENCE_PROVIDER_IDS = [
  "deterministic",
] as const;
export type AiBusinessIntelligenceProviderId =
  | (typeof AI_BUSINESS_INTELLIGENCE_PROVIDER_IDS)[number]
  | (string & {});

export type AiBusinessIntelligenceInput = {
  prompt: string;
  options?: Pick<
    AiGenerationOptions,
    "locale" | "category" | "tone" | "includePageTypes"
  >;
};

/**
 * Pluggable BI analyzer. C2 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiBusinessIntelligenceProvider {
  readonly id: AiBusinessIntelligenceProviderId;
  analyze(
    input: AiBusinessIntelligenceInput,
  ): AiBusinessProfile | Promise<AiBusinessProfile>;
}

export type AiBusinessIntelligenceResult = {
  profile: AiBusinessProfile;
  providerId: AiBusinessIntelligenceProviderId;
};
