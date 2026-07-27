/**
 * Business Intelligence Layer (Sprint C2).
 * Deterministic prompt → AiBusinessProfile engine with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  type AiBusinessIntelligenceInput,
  type AiBusinessIntelligenceProvider,
  type AiBusinessIntelligenceProviderId,
  type AiBusinessIntelligenceResult,
  AI_BUSINESS_INTELLIGENCE_PROVIDER_IDS,
} from "@/lib/website/ai/intelligence/types";

export {
  inferBusinessProfile,
  inferBusinessProfileFromPrompt,
  profileToGenerationIntentFields,
  isAiBrandPersonality,
  isAiBusinessType,
  isAiColourDirection,
  isAiContactPreference,
  isAiGenerationToneValue,
  isAiVisualStyle,
  isSiteCategoryIdValue,
} from "@/lib/website/ai/intelligence/engine";

export {
  CATEGORY_DEFAULTS,
  CATEGORY_LEXICON,
  INDUSTRY_LEXICON,
} from "@/lib/website/ai/intelligence/lexicon";

export {
  DeterministicBusinessIntelligenceProvider,
  analyzeBusinessPrompt,
  analyzeBusinessPromptSync,
  getBusinessIntelligenceProvider,
  listBusinessIntelligenceProviders,
  registerBusinessIntelligenceProvider,
} from "@/lib/website/ai/intelligence/provider";
