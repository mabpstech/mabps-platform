/**
 * AI Website Generator — shared foundation (types, validators, helpers).
 * Pipeline, LLM, API, and UI land in later commits.
 */

export {
  AI_GENERATION_STATUSES,
  AI_GENERATION_TONES,
  AI_WEBSITE_BLUEPRINT_VERSION,
  type AiBusinessProfile,
  type AiGeneratedFooter,
  type AiGeneratedHeader,
  type AiGeneratedNavItem,
  type AiGeneratedPage,
  type AiGeneratedSection,
  type AiGeneratedSeo,
  type AiGeneratedSiteMeta,
  type AiGeneratedTheme,
  type AiGenerationIntent,
  type AiGenerationOptions,
  type AiGenerationStatus,
  type AiGenerationTone,
  type AiResolvedThemeTokens,
  type AiThemeTokenPatch,
  type AiWebsiteBlueprint,
  type AiWebsiteBlueprintVersion,
  type AiWebsiteGenerateInput,
  type AiWebsiteGenerateResult,
  type AiWebsiteGenerationRecord,
} from "@/lib/website/ai/types";

export {
  assertAiWebsiteBlueprint,
  isAiGenerationStatus,
  isAiGenerationTone,
  isAiWebsiteBlueprint,
  isPlainObject,
  parseAiWebsiteBlueprint,
  type AiBlueprintParseResult,
  type AiBlueprintValidationIssue,
} from "@/lib/website/ai/validate";

export {
  AI_DEFAULT_PAGE_TYPES,
  AI_TEXT_LIMITS,
  aiSafeSlug,
  clampAiText,
  clampAiTextByKey,
  countBlueprintSections,
  createEmptyBlueprint,
  createEmptyBusinessProfile,
  createEmptyIntent,
  createGeneratedPage,
  createGeneratedSection,
  ensureHomePageFirst,
  findBlueprintPage,
  flattenNavItems,
  listBlueprintPageSlugs,
  mergeGenerationOptions,
  normalizeGenerateInput,
  resolveNavHref,
  type AiTextLimitKey,
} from "@/lib/website/ai/helpers";
