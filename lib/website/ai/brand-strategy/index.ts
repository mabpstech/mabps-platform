/**
 * Brand Strategy Layer (Sprint C4).
 * Deterministic AiBusinessDNA → AiBrandStrategy engine with pluggable providers.
 */

export {
  AI_CONFIDENCE_THRESHOLD,
  AI_BRAND_STRATEGY_PROVIDER_IDS,
  type AiBrandStrategyInput,
  type AiBrandStrategyProvider,
  type AiBrandStrategyProviderId,
  type AiBrandStrategyResult,
} from "@/lib/website/ai/brand-strategy/types";

export {
  createEmptyBrandStrategy,
  inferBrandStrategy,
  inferBrandStrategyFromDna,
} from "@/lib/website/ai/brand-strategy/engine";

export {
  BRAND_POSITION_TO_PROMISE,
  BRAND_POSITION_TO_UVP,
  COLOUR_TO_PHOTOGRAPHY,
  EMPTY_BRAND_STRATEGY_DEFAULTS,
  HERO_TO_MESSAGE_STRATEGY,
  VISUAL_TO_ICON,
  VISUAL_TO_ILLUSTRATION,
  VISUAL_TO_IMAGE_STYLE,
} from "@/lib/website/ai/brand-strategy/lexicon";

export {
  DeterministicBrandStrategyProvider,
  deriveBrandStrategy,
  deriveBrandStrategySync,
  getBrandStrategyProvider,
  listBrandStrategyProviders,
  registerBrandStrategyProvider,
} from "@/lib/website/ai/brand-strategy/provider";
