/**
 * Generation Orchestrator contracts (AI Pipeline Phase 2.5–3).
 * Phase 2.5: build ordered generation queue.
 * Phase 3: dispatch implemented generators (hero only) through the orchestrator.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type {
  HeroGeneratorLlmCompleter,
  HeroGeneratorMeta,
  HeroSectionContent,
} from "@/lib/website/ai/generators/hero/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";

/** One section-generation step in the ordered queue. */
export type GenerationTask = {
  /** Page id from WebsitePlan, or "site" for site-wide chrome (e.g. Footer). */
  page: string;
  /** Section type label from WebsitePlan (structure only). */
  section: string;
  /** Generator id that should run for this section later. */
  generator: string;
};

/**
 * Ordered execution plan for downstream section generators.
 * Does not contain generated copy, HTML, or components.
 */
export type GenerationPlan = {
  tasks: GenerationTask[];
};

export type CreateGenerationPlanInput = {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
};

/** Outcome of running a single queued task via the orchestrator. */
export type GenerationTaskResult = {
  task: GenerationTask;
  /** "generated" for implemented generators; others are skipped in Phase 3. */
  status: "generated" | "skipped";
  /** Present when status is generated and generator is hero-generator. */
  hero?: HeroSectionContent;
  /** Hero generator meta when hero ran. */
  heroMeta?: HeroGeneratorMeta;
  /** Why a task was skipped (unimplemented generator, etc.). */
  skipReason?: string;
};

export type GenerationRunResult = {
  plan: GenerationPlan;
  results: GenerationTaskResult[];
  /** First generated hero section content, if any. */
  hero: HeroSectionContent | null;
  heroMeta: HeroGeneratorMeta | null;
};

export type RunGenerationPlanInput = {
  businessPlan: BusinessPlan;
  websitePlan: WebsitePlan;
  /** Optional pre-built plan; otherwise created from WebsitePlan. */
  plan?: GenerationPlan;
  workspaceId?: string;
  apiKey?: string;
  baseUrl?: string | null;
  model?: string | null;
};

export type RunGenerationPlanOptions = {
  skipLlm?: boolean;
  /** Inject hero JSON completer (tests / alternate providers). */
  heroCompleteJson?: HeroGeneratorLlmCompleter;
};
