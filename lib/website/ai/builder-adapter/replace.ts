/**
 * Live Hero replacement (AI Pipeline Phase 4).
 * Swaps the legacy Hero inside Builder JSON / blueprint with adapted
 * generator output. Does not touch Builder UI or Editor.
 *
 * Source of truth for home Hero *content*: generationRun.hero (Hero Generator).
 * Legacy Composer shell is structure-only and used only when the new pipeline
 * did not produce a Hero.
 */

import { adaptHeroToBuilderSection } from "@/lib/website/ai/builder-adapter/hero";
import type {
  BuilderAdapterOptions,
  BuilderSectionJson,
} from "@/lib/website/ai/builder-adapter/types";
import type { GenerationRunResult } from "@/lib/website/ai/orchestrator/types";
import type {
  AiGeneratedPage,
  AiGeneratedSection,
  AiWebsiteBlueprint,
} from "@/lib/website/ai/types";

/** Whether home Hero content came from the new pipeline or legacy shell. */
export type HeroBlueprintSource = "pipeline" | "fallback";

export type ApplyHeroToBlueprintResult = {
  blueprint: AiWebsiteBlueprint;
  source: HeroBlueprintSource;
};

/**
 * Replace the first Hero with `heroSection` and drop any extras.
 * Non-hero sections keep their order and content.
 * If no Hero exists, insert one at the front.
 */
export function replaceHeroInSections(
  sections: BuilderSectionJson[],
  heroSection: BuilderSectionJson,
): BuilderSectionJson[] {
  const firstHeroIndex = sections.findIndex(
    (section) => section.type === "hero",
  );

  if (firstHeroIndex < 0) {
    return [heroSection, ...sections];
  }

  const next: BuilderSectionJson[] = [];
  let heroPlaced = false;
  for (const section of sections) {
    if (section.type === "hero") {
      if (!heroPlaced) {
        next.push(heroSection);
        heroPlaced = true;
      }
      continue;
    }
    next.push(section);
  }
  return next;
}

/** Pull CTA hrefs / settings from the legacy Hero shell when present. */
export function adapterOptionsFromLegacyHero(
  legacy: AiGeneratedSection | undefined,
  overrides: BuilderAdapterOptions = {},
): BuilderAdapterOptions {
  if (!legacy || legacy.type !== "hero") {
    return { ...overrides };
  }

  const content = legacy.content;
  const primaryHref =
    typeof content.primaryHref === "string" && content.primaryHref.trim()
      ? content.primaryHref.trim()
      : undefined;
  const secondaryHref =
    typeof content.secondaryHref === "string" && content.secondaryHref.trim()
      ? content.secondaryHref.trim()
      : undefined;

  return {
    primaryHref,
    secondaryHref,
    heroSettings: legacy.settings,
    ...overrides,
  };
}

/**
 * Apply generationRun Hero onto a page's sections (replace, never append).
 * Returns the original page when generationRun has no Hero (legacy fallback).
 */
export function applyHeroToPage(
  page: AiGeneratedPage,
  generationRun: GenerationRunResult,
  options: BuilderAdapterOptions = {},
): AiGeneratedPage {
  if (!generationRun.hero) {
    return page;
  }

  const legacyHero = page.sections.find((section) => section.type === "hero");
  const adapted = adaptHeroToBuilderSection(
    generationRun.hero,
    adapterOptionsFromLegacyHero(legacyHero, options),
  );

  return {
    ...page,
    sections: replaceHeroInSections(page.sections, adapted),
  };
}

/**
 * Replace the home-page Hero inside a composed blueprint.
 * About / Features / CTA and other pages stay unchanged.
 * When generationRun.hero is null, keeps the legacy Composer shell (fallback).
 */
export function applyHeroToBlueprint(
  blueprint: AiWebsiteBlueprint,
  generationRun: GenerationRunResult,
  options: BuilderAdapterOptions = {},
): ApplyHeroToBlueprintResult {
  if (!generationRun.hero) {
    console.info("[ai/hero] Hero fallback used", {
      reason: "generationRun.hero is null",
      message:
        "Keeping legacy Composer home Hero shell; new pipeline produced no Hero.",
    });
    return { blueprint, source: "fallback" };
  }

  const next: AiWebsiteBlueprint = {
    ...blueprint,
    pages: blueprint.pages.map((page) =>
      page.pageType === "home"
        ? applyHeroToPage(page, generationRun, options)
        : page,
    ),
  };

  const homeHero = next.pages
    .find((page) => page.pageType === "home")
    ?.sections.find((section) => section.type === "hero");

  console.info("[ai/hero] Hero injected into blueprint", {
    source: "pipeline",
    pageType: "home",
    heading: homeHero?.content.heading ?? generationRun.hero.headline,
    subheading: homeHero?.content.subheading ?? generationRun.hero.subheadline,
    primaryLabel:
      homeHero?.content.primaryLabel ?? generationRun.hero.primaryCTA,
  });

  return { blueprint: next, source: "pipeline" };
}
