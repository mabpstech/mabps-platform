/**
 * Generation Orchestrator (AI Pipeline Phase 2.5).
 * BusinessPlan + WebsitePlan → GenerationPlan. Queue only — never generates.
 */

export type {
  CreateGenerationPlanInput,
  GenerationPlan,
  GenerationTask,
} from "@/lib/website/ai/orchestrator/types";

export {
  SECTION_TO_GENERATOR,
  resolveGeneratorId,
} from "@/lib/website/ai/orchestrator/generators";

export { createGenerationPlan } from "@/lib/website/ai/orchestrator/engine";

export {
  EXAMPLE_GENERATION_PLAN_HOME_SLICE,
  EXAMPLE_ORCHESTRATOR_BUSINESS_PLAN,
  EXAMPLE_ORCHESTRATOR_WEBSITE_PLAN,
} from "@/lib/website/ai/orchestrator/example";
