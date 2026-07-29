/**
 * Hero generator → existing Builder Hero section JSON.
 * Reuses the Hero component schema; does not invent fields or markup.
 */

import type { HeroSectionContent } from "@/lib/website/ai/generators/hero/types";
import {
  DEFAULT_PRIMARY_HREF,
  DEFAULT_SECONDARY_HREF,
  resolveHeroLayoutFields,
} from "@/lib/website/ai/builder-adapter/lexicon";
import type {
  BuilderAdapterOptions,
  BuilderHeroContent,
  BuilderSectionJson,
} from "@/lib/website/ai/builder-adapter/types";

/**
 * Map structured hero generator content onto Builder hero `content`.
 * `imagePrompt` is intentionally dropped — media is not part of this phase.
 */
export function adaptHeroContent(
  hero: HeroSectionContent,
  options: BuilderAdapterOptions = {},
): BuilderHeroContent {
  const layout = resolveHeroLayoutFields(hero.layout, hero.style);
  const secondaryLabel = hero.secondaryCTA?.trim() ?? "";
  const primaryHref = options.primaryHref?.trim() || DEFAULT_PRIMARY_HREF;
  const secondaryHref = secondaryLabel
    ? options.secondaryHref?.trim() || DEFAULT_SECONDARY_HREF
    : "";

  return {
    eyebrow: "",
    heading: hero.headline.trim(),
    subheading: hero.subheadline.trim(),
    primaryLabel: hero.primaryCTA.trim(),
    primaryHref,
    secondaryLabel,
    secondaryHref,
    align: layout.align,
    height: layout.height,
    overlay: layout.overlay,
    animation: layout.animation,
    backgroundMediaId: null,
    mobileMediaId: null,
    desktopMediaId: null,
    backgroundVideoUrl: "",
  };
}

/** Wrap adapted hero content as a Builder section payload. */
export function adaptHeroToBuilderSection(
  hero: HeroSectionContent,
  options: BuilderAdapterOptions = {},
): BuilderSectionJson {
  const section: BuilderSectionJson = {
    type: "hero",
    content: adaptHeroContent(hero, options) as unknown as Record<
      string,
      unknown
    >,
  };
  if (options.heroSettings) {
    section.settings = options.heroSettings;
  }
  return section;
}
