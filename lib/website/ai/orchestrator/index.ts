/**
 * Generation Orchestrator (AI Pipeline Phase 2.5–3).
 * BusinessPlan + WebsitePlan → GenerationPlan; Phase 3 runs hero-generator only.
 */

export type {
  CreateGenerationPlanInput,
  GenerationPlan,
  GenerationRunResult,
  GenerationTask,
  GenerationTaskResult,
  RunGenerationPlanInput,
  RunGenerationPlanOptions,
} from "@/lib/website/ai/orchestrator/types";

export {
  SECTION_TO_GENERATOR,
  resolveGeneratorId,
} from "@/lib/website/ai/orchestrator/generators";

export { createGenerationPlan } from "@/lib/website/ai/orchestrator/engine";

export { runGenerationPlan } from "@/lib/website/ai/orchestrator/run";

export {
  EXAMPLE_GENERATION_PLAN_HOME_SLICE,
  EXAMPLE_ORCHESTRATOR_BUSINESS_PLAN,
  EXAMPLE_ORCHESTRATOR_WEBSITE_PLAN,
} from "@/lib/website/ai/orchestrator/example";
