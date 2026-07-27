/**
 * Website Planning Layer (Sprint C5).
 * Deterministic BI + DNA + Brand Strategy → AiWebsitePlan with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  AI_WEBSITE_PLAN_PROVIDER_IDS,
  type AiWebsitePlanInput,
  type AiWebsitePlanProvider,
  type AiWebsitePlanProviderId,
  type AiWebsitePlanResult,
} from "@/lib/website/ai/website-plan/types";

export {
  createEmptyWebsitePlan,
  inferWebsitePlan,
  inferWebsitePlanFromInputs,
} from "@/lib/website/ai/website-plan/engine";

export {
  BUSINESS_TYPE_TO_PURPOSE,
  EMPTY_WEBSITE_PLAN_DEFAULTS,
  PURPOSE_TO_NAV_PATTERN,
  SECTION_EMPHASIS_TO_ROLES,
} from "@/lib/website/ai/website-plan/lexicon";

export {
  DeterministicWebsitePlanProvider,
  deriveWebsitePlan,
  deriveWebsitePlanSync,
  getWebsitePlanProvider,
  listWebsitePlanProviders,
  registerWebsitePlanProvider,
} from "@/lib/website/ai/website-plan/provider";
