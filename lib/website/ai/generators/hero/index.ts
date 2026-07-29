/**
 * Hero section generator (AI Pipeline Phase 3).
 * BusinessPlan + WebsitePlan + GenerationTask → HeroSectionContent.
 * Structured content only — never HTML, JSX, CSS, or components.
 */

export type {
  HeroGeneratorInput,
  HeroGeneratorLlmCompleter,
  HeroGeneratorMeta,
  HeroGeneratorOptions,
  HeroGeneratorResult,
  HeroLayout,
  HeroSectionContent,
  HeroSectionParseResult,
  HeroStyle,
} from "@/lib/website/ai/generators/hero/types";

export {
  HERO_LAYOUTS,
  HERO_STYLES,
} from "@/lib/website/ai/generators/hero/types";

export {
  HERO_GENERATOR_SYSTEM_PROMPT,
  HERO_HEADLINE_MAX_WORDS,
  HERO_SECTION_FORBIDDEN_KEYS,
  HERO_SECTION_KEYS,
  HERO_SUBHEADLINE_MAX_WORDS,
  buildHeroJsonSchemaPrompt,
  type HeroSectionKey,
} from "@/lib/website/ai/generators/hero/schema";

export {
  countWords,
  parseHeroSection,
  parseHeroSectionFromContent,
} from "@/lib/website/ai/generators/hero/validate";

export { inferHeroSection } from "@/lib/website/ai/generators/hero/engine";

export {
  completeHeroWithOpenAi,
  hasHeroGeneratorOpenAiCredentials,
} from "@/lib/website/ai/generators/hero/openai";

export {
  generateHero,
  generateHeroSync,
  resolveHeroSection,
} from "@/lib/website/ai/generators/hero/generator";

export {
  EXAMPLE_HERO_SECTION,
  EXAMPLE_HERO_TASK,
} from "@/lib/website/ai/generators/hero/example";
