/**
 * Website Planner contracts (AI Pipeline Phase 2).
 * Decides website structure only — never generates copy, HTML, or components.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";

/** One page in the planned site structure. */
export type WebsitePagePlan = {
  /** Stable page id / slug, e.g. "home", "menu", "contact". */
  id: string;
  /** Required section type labels for this page (structure only, not copy). */
  sections: string[];
};

/**
 * Website structure plan derived from a BusinessPlan.
 * Navigation, pages, sections, footer — no marketing copy or visuals.
 */
export type WebsitePlan = {
  /** Primary navigation labels in display order. */
  navigation: string[];
  /** Pages with required sections (page hierarchy = array order). */
  pages: WebsitePagePlan[];
  /** Footer link labels (structure only). */
  footerLinks: string[];
  /** Labels for content that must exist later (not the content itself). */
  contentRequirements: string[];
};

export type WebsitePlannerInput = {
  businessPlan: BusinessPlan;
  /** Optional original prompt for industry hints in fallback. */
  prompt?: string;
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type WebsitePlannerMeta = {
  usedLlm: boolean;
  llmFallback: boolean;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  validationIssues: Array<{ path: string; message: string }>;
};

export type WebsitePlannerResult = {
  plan: WebsitePlan;
  meta: WebsitePlannerMeta;
};

/**
 * Pluggable JSON completer for the website planner (OpenAI default; mocks in tests).
 */
export type WebsitePlannerLlmCompleter = (input: {
  businessPlan: BusinessPlan;
  prompt?: string;
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

export type WebsitePlannerOptions = {
  /** Skip LLM and use deterministic inference only. */
  skipLlm?: boolean;
  /** Inject a JSON completer (tests / alternate providers). */
  completeJson?: WebsitePlannerLlmCompleter;
};

export type WebsitePlanParseResult =
  | {
      ok: true;
      plan: WebsitePlan;
      issues: [];
    }
  | {
      ok: false;
      plan: null;
      issues: Array<{ path: string; message: string }>;
    };
