/**
 * Website Composer Layer contracts (Sprint C6).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type { AiGenerationOptions } from "@/lib/website/ai/types";
import type {
  AiBrandStrategy,
  AiBusinessDNA,
  AiBusinessProfile,
  AiWebsiteBlueprint,
  AiWebsitePlan,
} from "@/lib/website/ai/types";

/** Re-use BI threshold for soft vs firm compositional signals. */
export { AI_CONFIDENCE_THRESHOLD } from "@/lib/website/ai/intelligence/types";

export const AI_WEBSITE_COMPOSER_PROVIDER_IDS = ["deterministic"] as const;
export type AiWebsiteComposerProviderId =
  | (typeof AI_WEBSITE_COMPOSER_PROVIDER_IDS)[number]
  | (string & {});

export type AiWebsiteComposerInput = {
  profile: AiBusinessProfile;
  dna: AiBusinessDNA;
  strategy: AiBrandStrategy;
  plan: AiWebsitePlan;
  /** Original prompt for intent — composer does not rewrite or invent copy. */
  prompt?: string;
  options?: AiGenerationOptions;
};

/**
 * Pluggable composer. C6 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiWebsiteComposerProvider {
  readonly id: AiWebsiteComposerProviderId;
  compose(
    input: AiWebsiteComposerInput,
  ): AiWebsiteBlueprint | Promise<AiWebsiteBlueprint>;
}

export type AiWebsiteComposerResult = {
  blueprint: AiWebsiteBlueprint;
  providerId: AiWebsiteComposerProviderId;
};
