/**
 * Business DNA Layer contracts (Sprint C3).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type { AiBusinessDNA, AiBusinessProfile } from "@/lib/website/ai/types";

/** Re-use BI threshold: below this, treat DNA values as soft hints. */
export { AI_CONFIDENCE_THRESHOLD } from "@/lib/website/ai/intelligence/types";

export const AI_BUSINESS_DNA_PROVIDER_IDS = ["deterministic"] as const;
export type AiBusinessDnaProviderId =
  | (typeof AI_BUSINESS_DNA_PROVIDER_IDS)[number]
  | (string & {});

export type AiBusinessDnaInput = {
  profile: AiBusinessProfile;
};

/**
 * Pluggable DNA deriver. C3 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiBusinessDnaProvider {
  readonly id: AiBusinessDnaProviderId;
  derive(input: AiBusinessDnaInput): AiBusinessDNA | Promise<AiBusinessDNA>;
}

export type AiBusinessDnaResult = {
  dna: AiBusinessDNA;
  providerId: AiBusinessDnaProviderId;
};
