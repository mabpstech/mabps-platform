/**
 * Hero section generator contracts (AI Pipeline Phase 3).
 * Emits structured hero content only — never HTML, JSX, CSS, or components.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";

export const HERO_LAYOUTS = [
  "split-left",
  "split-right",
  "center",
  "fullscreen",
] as const;

export type HeroLayout = (typeof HERO_LAYOUTS)[number];

export const HERO_STYLES = [
  "luxury",
  "modern",
  "minimal",
  "spiritual",
  "corporate",
  "restaurant",
  "healthcare",
] as const;

export type HeroStyle = (typeof HERO_STYLES)[number];

/**
 * Strict JSON content for a single Hero section.
 * No markup, components, or builder payloads.
 */
export type HeroSectionContent = {
  headline: string;
  subheadline: string;
  primaryCTA: string;
  secondaryCTA?: string;
  imagePrompt: string;
  layout: HeroLayout;
  style: HeroStyle;
};

export type HeroGeneratorInput = {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
  task: GenerationTask;
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type HeroGeneratorMeta = {
  usedLlm: boolean;
  llmFallback: boolean;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  validationIssues: Array<{ path: string; message: string }>;
};

export type HeroGeneratorResult = {
  content: HeroSectionContent;
  meta: HeroGeneratorMeta;
};

/**
 * Pluggable JSON completer for the hero generator (OpenAI default; mocks in tests).
 */
export type HeroGeneratorLlmCompleter = (input: {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
  task: GenerationTask;
  systemPrompt: string;
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
}) => Promise<{
  content: string;
  raw: unknown;
  providerId: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}>;

export type HeroGeneratorOptions = {
  /** Skip LLM and use deterministic inference only. */
  skipLlm?: boolean;
  /** Inject a JSON completer (tests / alternate providers). */
  completeJson?: HeroGeneratorLlmCompleter;
};

export type HeroSectionParseResult =
  | {
      ok: true;
      content: HeroSectionContent;
      issues: [];
    }
  | {
      ok: false;
      content: null;
      issues: Array<{ path: string; message: string }>;
    };
