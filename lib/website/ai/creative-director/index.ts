/**
 * Creative Director Layer (Sprint C7).
 * Deterministic DNA + Brand Strategy + Website Plan → AiCreativeDirection
 * with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  AI_CREATIVE_DIRECTOR_PROVIDER_IDS,
  type AiCreativeDirectorInput,
  type AiCreativeDirectorProvider,
  type AiCreativeDirectorProviderId,
  type AiCreativeDirectorResult,
} from "@/lib/website/ai/creative-director/types";

export {
  createEmptyCreativeDirection,
  inferCreativeDirection,
  inferCreativeDirectionFromInputs,
} from "@/lib/website/ai/creative-director/engine";

export {
  EMPTY_CREATIVE_DIRECTION_DEFAULTS,
  HERO_STRATEGY_TO_COMPOSITION,
  VISUAL_IDENTITY_TO_ART,
} from "@/lib/website/ai/creative-director/lexicon";

export {
  DeterministicCreativeDirectorProvider,
  deriveCreativeDirection,
  deriveCreativeDirectionSync,
  getCreativeDirectorProvider,
  listCreativeDirectorProviders,
  registerCreativeDirectorProvider,
} from "@/lib/website/ai/creative-director/provider";
