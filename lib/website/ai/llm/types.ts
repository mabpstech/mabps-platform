/**
 * Website AI LLM contracts (Sprint B3).
 * Providers return structured prompt signals only — never Website Builder data.
 */

import type {
  AiBrandPersonality,
  AiBusinessType,
  AiColourDirection,
  AiContactPreference,
  AiGenerationTone,
  AiPrimaryCta,
  AiVisualStyle,
} from "@/lib/website/ai/types";
import type { SiteCategoryId } from "@/lib/website/templates";
import type { PageType } from "@/lib/website/types";

/**
 * Structured business understanding extracted from a user prompt.
 * Must not include pages/sections/theme/header/footer/nav/blueprint fields.
 */
export type AiWebsitePromptSignals = {
  businessName?: string;
  description?: string;
  slogan?: string;
  industry?: string;
  audience?: string;
  locale?: string;
  language?: string;
  country?: string;
  region?: string;
  category?: SiteCategoryId;
  businessType?: AiBusinessType;
  tone?: AiGenerationTone;
  brandPersonality?: AiBrandPersonality[];
  visualStyle?: AiVisualStyle;
  colourDirection?: AiColourDirection;
  primaryCta?: AiPrimaryCta;
  suggestedPages?: PageType[];
  suggestedFeatures?: string[];
  trustSignals?: string[];
  contactPreferences?: AiContactPreference[];
  seoKeywords?: string[];
};

export const AI_WEBSITE_LLM_PROVIDER_IDS = ["openai"] as const;
export type AiWebsiteLlmProviderId =
  | (typeof AI_WEBSITE_LLM_PROVIDER_IDS)[number]
  | (string & {});

export type AiWebsiteLlmExtractInput = {
  prompt: string;
  workspaceId?: string;
  /** Override API key (tests / env). */
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type AiWebsiteLlmExtractResult = {
  /** Raw parsed object before validation (may be invalid). */
  raw: unknown;
  content: string;
  providerId: AiWebsiteLlmProviderId;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

export interface AiWebsiteLlmProvider {
  readonly id: AiWebsiteLlmProviderId;
  /**
   * Call the model and return JSON content only.
   * Must not invent Website Builder persistence shapes.
   */
  extractPromptSignals(
    input: AiWebsiteLlmExtractInput,
  ): Promise<AiWebsiteLlmExtractResult>;
}

export type AiWebsiteLlmParseResult =
  | {
      ok: true;
      signals: AiWebsitePromptSignals;
      issues: [];
    }
  | {
      ok: false;
      signals: null;
      issues: Array<{ path: string; message: string }>;
    };
