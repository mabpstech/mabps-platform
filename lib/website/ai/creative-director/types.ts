/**
 * Creative Director Layer contracts (Sprint C7).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type {
  AiBrandStrategy,
  AiBusinessDNA,
  AiCreativeDirection,
  AiWebsitePlan,
} from "@/lib/website/ai/types";

/** Re-use BI threshold: below this, treat creative values as soft hints. */
export { AI_CONFIDENCE_THRESHOLD } from "@/lib/website/ai/intelligence/types";

export const AI_CREATIVE_DIRECTOR_PROVIDER_IDS = ["deterministic"] as const;
export type AiCreativeDirectorProviderId =
  | (typeof AI_CREATIVE_DIRECTOR_PROVIDER_IDS)[number]
  | (string & {});

export type AiCreativeDirectorInput = {
  dna: AiBusinessDNA;
  strategy: AiBrandStrategy;
  plan: AiWebsitePlan;
};

/**
 * Pluggable creative-director. C7 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiCreativeDirectorProvider {
  readonly id: AiCreativeDirectorProviderId;
  direct(
    input: AiCreativeDirectorInput,
  ): AiCreativeDirection | Promise<AiCreativeDirection>;
}

export type AiCreativeDirectorResult = {
  direction: AiCreativeDirection;
  providerId: AiCreativeDirectorProviderId;
};
