/**
 * Business Planner (AI Pipeline Phase 1).
 * Prompt → BusinessPlan. Understands the business only — never builds a site.
 */

export type {
  BusinessPlan,
  BusinessPlanParseResult,
  BusinessPlannerInput,
  BusinessPlannerLlmCompleter,
  BusinessPlannerMeta,
  BusinessPlannerOptions,
  BusinessPlannerResult,
  SectionPlan,
  WebsitePlan,
} from "@/lib/website/ai/business-planner/types";

export {
  BUSINESS_PLANNER_SYSTEM_PROMPT,
  BUSINESS_PLAN_FORBIDDEN_KEYS,
  BUSINESS_PLAN_KEYS,
  buildBusinessPlanJsonSchemaPrompt,
  type BusinessPlanKey,
} from "@/lib/website/ai/business-planner/schema";

export {
  parseBusinessPlan,
  parseBusinessPlanFromContent,
  toWebsitePlan,
} from "@/lib/website/ai/business-planner/validate";

export {
  businessPlanFromProfile,
  inferBusinessPlan,
} from "@/lib/website/ai/business-planner/engine";

export {
  completeBusinessPlanWithOpenAi,
  hasBusinessPlannerOpenAiCredentials,
} from "@/lib/website/ai/business-planner/openai";

export {
  planBusinessFromPrompt,
  planBusinessFromPromptSync,
  resolveBusinessPlan,
} from "@/lib/website/ai/business-planner/planner";

export {
  EXAMPLE_BUSINESS_PLAN,
  EXAMPLE_BUSINESS_PLANNER_PROMPT,
} from "@/lib/website/ai/business-planner/example";
