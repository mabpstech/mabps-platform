/**
 * Builder Adapter (AI Pipeline Phase 3.5–4).
 * generationRun → existing Website Builder section JSON.
 * Phase 3.5: adapt Hero. Phase 4: replace legacy Hero in blueprint.
 * Reuses the existing Hero component schema.
 * Does not modify Builder, Editor, or UI.
 */

export type {
  AdaptGenerationRunInput,
  AdaptHeroInput,
  BuilderAdapterOptions,
  BuilderHeroContent,
  BuilderJson,
  BuilderSectionJson,
} from "@/lib/website/ai/builder-adapter/types";

export {
  DEFAULT_PRIMARY_HREF,
  DEFAULT_SECONDARY_HREF,
  HERO_LAYOUT_TO_BUILDER,
  HERO_STYLE_TO_BUILDER,
  resolveHeroLayoutFields,
} from "@/lib/website/ai/builder-adapter/lexicon";

export {
  adaptHeroContent,
  adaptHeroToBuilderSection,
} from "@/lib/website/ai/builder-adapter/hero";

export {
  adaptGenerationRun,
  adaptGenerationRunToBuilder,
} from "@/lib/website/ai/builder-adapter/engine";

export {
  adapterOptionsFromLegacyHero,
  applyHeroToBlueprint,
  applyHeroToPage,
  replaceHeroInSections,
} from "@/lib/website/ai/builder-adapter/replace";

export {
  EXAMPLE_BUILDER_HERO_SECTION,
  EXAMPLE_BUILDER_JSON,
  EXAMPLE_GENERATION_RUN_WITH_HERO,
} from "@/lib/website/ai/builder-adapter/example";
