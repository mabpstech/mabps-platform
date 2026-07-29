/**
 * Example Generation Orchestrator output for the jewellery WebsitePlan.
 * Illustrative only — not used at runtime.
 */

import { EXAMPLE_BUSINESS_PLAN } from "@/lib/website/ai/business-planner/example";
import { EXAMPLE_WEBSITE_PLAN } from "@/lib/website/ai/website-planner/example";
import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";
import type { GenerationPlan } from "@/lib/website/ai/orchestrator/types";

export const EXAMPLE_ORCHESTRATOR_BUSINESS_PLAN: BusinessPlan =
  EXAMPLE_BUSINESS_PLAN;

export const EXAMPLE_ORCHESTRATOR_WEBSITE_PLAN: WebsitePlan = EXAMPLE_WEBSITE_PLAN;

/** Home-page slice of the example queue (matches Phase 2.5 contract shape). */
export const EXAMPLE_GENERATION_PLAN_HOME_SLICE: GenerationPlan = {
  tasks: [
    { page: "home", section: "Hero", generator: "hero-generator" },
    { page: "home", section: "Featured", generator: "featured-generator" },
    {
      page: "home",
      section: "Collections",
      generator: "collection-generator",
    },
    { page: "home", section: "Benefits", generator: "benefit-generator" },
    {
      page: "home",
      section: "Testimonials",
      generator: "testimonial-generator",
    },
    { page: "home", section: "CTA", generator: "cta-generator" },
  ],
};
