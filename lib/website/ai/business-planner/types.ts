/**
 * Business Planner contracts (AI Pipeline Phase 1).
 * Understands the user prompt only — never generates a website.
 */

/** Reusable section intent for later pipeline stages (roles only, no copy/HTML). */
export type SectionPlan = {
  /** Stable section role key, e.g. "hero", "features", "cta". */
  role: string;
  /** Optional page this section belongs to, e.g. "home". */
  page?: string;
};

/**
 * Website structure intent derived by the planner.
 * Reusable by future architecture / composer stages.
 */
export type WebsitePlan = {
  /** Page type identifiers (not page objects or HTML). */
  pages: string[];
  /** Required section roles (not section instances or copy). */
  requiredSections: SectionPlan[];
};

/**
 * Structured business understanding from a natural-language prompt.
 * Flat shape matches the Phase 1 planner JSON contract.
 */
export type BusinessPlan = {
  businessType: string;
  industry: string;
  targetAudience: string;
  goals: string[];
  tone: string;
  style: string;
  services: string[];
  pages: string[];
  requiredSections: SectionPlan[];
};

export type BusinessPlannerInput = {
  prompt: string;
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type BusinessPlannerMeta = {
  usedLlm: boolean;
  llmFallback: boolean;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  validationIssues: Array<{ path: string; message: string }>;
};

export type BusinessPlannerResult = {
  plan: BusinessPlan;
  website: WebsitePlan;
  meta: BusinessPlannerMeta;
};

/**
 * Pluggable JSON completer for the planner (OpenAI default; mocks in tests).
 */
export type BusinessPlannerLlmCompleter = (input: {
  prompt: string;
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

export type BusinessPlannerOptions = {
  /** Skip LLM and use deterministic inference only. */
  skipLlm?: boolean;
  /** Inject a JSON completer (tests / alternate providers). */
  completeJson?: BusinessPlannerLlmCompleter;
};

export type BusinessPlanParseResult =
  | {
      ok: true;
      plan: BusinessPlan;
      issues: [];
    }
  | {
      ok: false;
      plan: null;
      issues: Array<{ path: string; message: string }>;
    };
