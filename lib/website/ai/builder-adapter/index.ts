/**
 * Builder Adapter (AI Pipeline Phase 3.5).
 * generationRun → existing Website Builder section JSON.
 * Hero only for now — reuses the existing Hero component schema.
 * Does not modify Builder, Editor, UI, or database.
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
  EXAMPLE_BUILDER_HERO_SECTION,
  EXAMPLE_BUILDER_JSON,
  EXAMPLE_GENERATION_RUN_WITH_HERO,
} from "@/lib/website/ai/builder-adapter/example";
