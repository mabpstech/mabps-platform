/**
 * Builder Adapter engine (AI Pipeline Phase 3.5).
 * generationRun → existing Builder JSON. Hero only; other sections ignored.
 */

import { adaptHeroToBuilderSection } from "@/lib/website/ai/builder-adapter/hero";
import type {
  AdaptGenerationRunInput,
  BuilderAdapterOptions,
  BuilderJson,
} from "@/lib/website/ai/builder-adapter/types";
import type { GenerationRunResult } from "@/lib/website/ai/orchestrator/types";

/**
 * Convert a Phase 3 generation run into Builder-compatible section JSON.
 * Only the first generated Hero is included. Skipped / unimplemented
 * generators are ignored.
 */
export function adaptGenerationRunToBuilder(
  generationRun: GenerationRunResult,
  options: BuilderAdapterOptions = {},
): BuilderJson {
  if (!generationRun.hero) {
    return { sections: [] };
  }

  return {
    sections: [adaptHeroToBuilderSection(generationRun.hero, options)],
  };
}

/** Convenience wrapper matching AdaptGenerationRunInput. */
export function adaptGenerationRun(
  input: AdaptGenerationRunInput,
  options: BuilderAdapterOptions = {},
): BuilderJson {
  return adaptGenerationRunToBuilder(input.generationRun, options);
}
