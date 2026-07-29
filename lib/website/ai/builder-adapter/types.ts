/**
 * Builder Adapter contracts (AI Pipeline Phase 3.5).
 * Converts generator outputs into existing Website Builder section JSON.
 * Does not modify Builder or Editor; does not persist.
 */

import type { HeroSectionContent } from "@/lib/website/ai/generators/hero/types";
import type { GenerationRunResult } from "@/lib/website/ai/orchestrator/types";
import type { AiGeneratedSection } from "@/lib/website/ai/types";
import type { SectionSettings } from "@/lib/website/types";

/**
 * Existing Hero section `content` shape used by Builder / public renderer
 * (see components/website/section-defaults.ts).
 */
export type BuilderHeroContent = {
  eyebrow: string;
  heading: string;
  subheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  align: "left" | "center" | "right";
  height: "sm" | "md" | "lg" | "xl";
  overlay: number;
  animation: "none" | "fade" | "rise";
  backgroundMediaId: string | null;
  mobileMediaId: string | null;
  desktopMediaId: string | null;
  backgroundVideoUrl: string;
};

/** Builder-compatible section payload (reuses AiGeneratedSection). */
export type BuilderSectionJson = AiGeneratedSection;

/**
 * Existing Builder JSON — sections only.
 * Phase 3.5 emits Hero alone; other generators are ignored.
 */
export type BuilderJson = {
  sections: BuilderSectionJson[];
};

export type BuilderAdapterOptions = {
  /** Override primary CTA href (default `/contact`). */
  primaryHref?: string;
  /** Override secondary CTA href (default `/about`). */
  secondaryHref?: string;
  /** Optional section settings for the adapted hero. */
  heroSettings?: SectionSettings;
};

export type AdaptGenerationRunInput = {
  generationRun: GenerationRunResult;
};

export type AdaptHeroInput = {
  hero: HeroSectionContent;
};
