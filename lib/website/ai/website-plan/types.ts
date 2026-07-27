/**
 * Website Planning Layer contracts (Sprint C5).
 * Deterministic today; provider interface allows future LLM adapters.
 */

import type {
  AiBrandStrategy,
  AiBusinessDNA,
  AiBusinessProfile,
  AiWebsitePlan,
} from "@/lib/website/ai/types";

/** Re-use BI threshold: below this, treat plan values as soft hints. */
export { AI_CONFIDENCE_THRESHOLD } from "@/lib/website/ai/intelligence/types";

export const AI_WEBSITE_PLAN_PROVIDER_IDS = ["deterministic"] as const;
export type AiWebsitePlanProviderId =
  | (typeof AI_WEBSITE_PLAN_PROVIDER_IDS)[number]
  | (string & {});

export type AiWebsitePlanInput = {
  profile: AiBusinessProfile;
  dna: AiBusinessDNA;
  strategy: AiBrandStrategy;
};

/**
 * Pluggable website-plan deriver. C5 ships only the deterministic provider;
 * future AI providers implement the same contract without changing callers.
 */
export interface AiWebsitePlanProvider {
  readonly id: AiWebsitePlanProviderId;
  plan(input: AiWebsitePlanInput): AiWebsitePlan | Promise<AiWebsitePlan>;
}

export type AiWebsitePlanResult = {
  plan: AiWebsitePlan;
  providerId: AiWebsitePlanProviderId;
};
