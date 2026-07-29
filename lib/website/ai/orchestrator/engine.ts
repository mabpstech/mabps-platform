/**
 * Generation Orchestrator engine (AI Pipeline Phase 2.5).
 * WebsitePlan (+ BusinessPlan context) → ordered GenerationPlan.
 * Never calls generators or produces content.
 */

import type {
  CreateGenerationPlanInput,
  GenerationPlan,
  GenerationTask,
} from "@/lib/website/ai/orchestrator/types";
import { resolveGeneratorId } from "@/lib/website/ai/orchestrator/generators";

/**
 * Build a deterministic generation queue from WebsitePlan pages/sections.
 * Page order × section order, then a single Footer task when footerLinks exist.
 * BusinessPlan is accepted for pipeline context; queue structure comes from WebsitePlan.
 */
export function createGenerationPlan(
  input: CreateGenerationPlanInput,
): GenerationPlan {
  if (!input.businessPlan) {
    throw new Error("businessPlan is required.");
  }
  if (!input.websitePlan) {
    throw new Error("websitePlan is required.");
  }

  const { websitePlan } = input;
  const tasks: GenerationTask[] = [];

  for (const page of websitePlan.pages) {
    const pageId = page.id.trim() || "home";
    for (const section of page.sections) {
      const label = section.trim();
      if (!label) continue;
      tasks.push({
        page: pageId,
        section: label,
        generator: resolveGeneratorId(label),
      });
    }
  }

  if (websitePlan.footerLinks.length > 0) {
    tasks.push({
      page: "site",
      section: "Footer",
      generator: resolveGeneratorId("Footer"),
    });
  }

  return { tasks };
}
