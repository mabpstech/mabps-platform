/**
 * Business DNA Layer (Sprint C3).
 * Deterministic AiBusinessProfile → AiBusinessDNA engine with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  AI_BUSINESS_DNA_PROVIDER_IDS,
  type AiBusinessDnaInput,
  type AiBusinessDnaProvider,
  type AiBusinessDnaProviderId,
  type AiBusinessDnaResult,
} from "@/lib/website/ai/dna/types";

export {
  createEmptyBusinessDna,
  inferBusinessDna,
  inferBusinessDnaFromProfile,
} from "@/lib/website/ai/dna/engine";

export {
  BUSINESS_TYPE_DNA_OVERRIDES,
  CATEGORY_DNA_DEFAULTS,
  COLOUR_TO_PSYCHOLOGY,
  PERSONALITY_DNA_NUDGES,
  TONE_DNA_OVERRIDES,
  VISUAL_STYLE_TO_IDENTITY,
} from "@/lib/website/ai/dna/lexicon";

export {
  DeterministicBusinessDnaProvider,
  deriveBusinessDna,
  deriveBusinessDnaSync,
  getBusinessDnaProvider,
  listBusinessDnaProviders,
  registerBusinessDnaProvider,
} from "@/lib/website/ai/dna/provider";
