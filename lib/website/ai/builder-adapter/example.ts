/**
 * Example Builder Adapter output for the jewellery / Kerala weddings hero.
 * Illustrative only — not used at runtime.
 */

import { EXAMPLE_HERO_SECTION } from "@/lib/website/ai/generators/hero/example";
import { adaptHeroToBuilderSection } from "@/lib/website/ai/builder-adapter/hero";
import type { BuilderJson } from "@/lib/website/ai/builder-adapter/types";
import type { GenerationRunResult } from "@/lib/website/ai/orchestrator/types";

export const EXAMPLE_BUILDER_HERO_SECTION = adaptHeroToBuilderSection(
  EXAMPLE_HERO_SECTION,
);

export const EXAMPLE_BUILDER_JSON: BuilderJson = {
  sections: [EXAMPLE_BUILDER_HERO_SECTION],
};

/** Minimal generationRun shape for adapter examples / smoke tests. */
export const EXAMPLE_GENERATION_RUN_WITH_HERO: GenerationRunResult = {
  plan: {
    tasks: [
      {
        page: "home",
        section: "Hero",
        generator: "hero-generator",
      },
    ],
  },
  results: [
    {
      task: {
        page: "home",
        section: "Hero",
        generator: "hero-generator",
      },
      status: "generated",
      hero: EXAMPLE_HERO_SECTION,
    },
  ],
  hero: EXAMPLE_HERO_SECTION,
  heroMeta: null,
};
