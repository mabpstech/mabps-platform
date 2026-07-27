/**
 * Brand Strategy Layer contracts (Sprint C4).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type { AiBrandStrategy, AiBusinessDNA } from "@/lib/website/ai/types";

/** Re-use BI threshold: below this, treat strategy values as soft hints. */
export { AI_CONFIDENCE_THRESHOLD } from "@/lib/website/ai/intelligence/types";

export const AI_BRAND_STRATEGY_PROVIDER_IDS = ["deterministic"] as const;
export type AiBrandStrategyProviderId =
  | (typeof AI_BRAND_STRATEGY_PROVIDER_IDS)[number]
  | (string & {});

export type AiBrandStrategyInput = {
  dna: AiBusinessDNA;
};

/**
 * Pluggable brand-strategy deriver. C4 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiBrandStrategyProvider {
  readonly id: AiBrandStrategyProviderId;
  derive(
    input: AiBrandStrategyInput,
  ): AiBrandStrategy | Promise<AiBrandStrategy>;
}

export type AiBrandStrategyResult = {
  strategy: AiBrandStrategy;
  providerId: AiBrandStrategyProviderId;
};
