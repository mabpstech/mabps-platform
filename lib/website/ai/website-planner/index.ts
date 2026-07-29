/**
 * Website Planner (AI Pipeline Phase 2).
 * BusinessPlan → WebsitePlan. Decides structure only — never builds a site.
 */

export type {
  WebsitePagePlan,
  WebsitePlan,
  WebsitePlanParseResult,
  WebsitePlannerInput,
  WebsitePlannerLlmCompleter,
  WebsitePlannerMeta,
  WebsitePlannerOptions,
  WebsitePlannerResult,
} from "@/lib/website/ai/website-planner/types";

export {
  WEBSITE_PLANNER_SYSTEM_PROMPT,
  WEBSITE_PLAN_FORBIDDEN_KEYS,
  WEBSITE_PLAN_KEYS,
  buildWebsitePlanJsonSchemaPrompt,
  type WebsitePlanKey,
} from "@/lib/website/ai/website-planner/schema";

export {
  parseWebsitePlan,
  parseWebsitePlanFromContent,
} from "@/lib/website/ai/website-planner/validate";

export {
  inferWebsitePlanFromBusinessPlan,
  inferWebsiteStructurePlan,
} from "@/lib/website/ai/website-planner/engine";

export {
  completeWebsitePlanWithOpenAi,
  hasWebsitePlannerOpenAiCredentials,
} from "@/lib/website/ai/website-planner/openai";

export {
  planWebsiteFromBusinessPlan,
  planWebsiteFromBusinessPlanSync,
  resolveWebsiteStructurePlan,
} from "@/lib/website/ai/website-planner/planner";

export {
  EXAMPLE_WEBSITE_PLAN,
  EXAMPLE_WEBSITE_PLANNER_BUSINESS_PLAN,
} from "@/lib/website/ai/website-planner/example";
