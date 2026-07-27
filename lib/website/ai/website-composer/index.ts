/**
 * Website Composer Layer (Sprint C6).
 * Deterministic AiWebsitePlan → AiWebsiteBlueprint with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  AI_WEBSITE_COMPOSER_PROVIDER_IDS,
  type AiWebsiteComposerInput,
  type AiWebsiteComposerProvider,
  type AiWebsiteComposerProviderId,
  type AiWebsiteComposerResult,
} from "@/lib/website/ai/website-composer/types";

export {
  composeWebsiteBlueprint,
  composeWebsiteBlueprintFromInputs,
} from "@/lib/website/ai/website-composer/engine";

export {
  COLOUR_PSYCHOLOGY_TO_PRESET,
  DENSITY_HOME_ROLE_CAP,
  DENSITY_TO_PADDING,
  HERO_STRATEGY_TO_LAYOUT,
  PAGE_TYPE_META,
  PURPOSE_TO_TEMPLATE,
  ROLE_TO_SECTION_TYPE,
  TRUST_FLOW_INSERT,
} from "@/lib/website/ai/website-composer/lexicon";

export {
  DeterministicWebsiteComposerProvider,
  composeWebsite,
  composeWebsiteSync,
  getWebsiteComposerProvider,
  listWebsiteComposerProviders,
  registerWebsiteComposerProvider,
} from "@/lib/website/ai/website-composer/provider";
