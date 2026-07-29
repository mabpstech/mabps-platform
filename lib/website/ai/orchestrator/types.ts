/**
 * Generation Orchestrator contracts (AI Pipeline Phase 2.5).
 * Builds an ordered generation queue only — never generates content.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
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
