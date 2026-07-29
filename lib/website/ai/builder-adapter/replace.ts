/**
 * Live Hero replacement (AI Pipeline Phase 4).
 * Swaps the legacy Hero inside Builder JSON / blueprint with adapted
 * generator output. Does not touch Builder UI or Editor.
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
 * When generationRun.hero is null, returns the blueprint as-is (legacy Hero).
 */
export function applyHeroToBlueprint(
  blueprint: AiWebsiteBlueprint,
  generationRun: GenerationRunResult,
  options: BuilderAdapterOptions = {},
): AiWebsiteBlueprint {
  if (!generationRun.hero) {
    return blueprint;
  }

  return {
    ...blueprint,
    pages: blueprint.pages.map((page) =>
      page.pageType === "home"
        ? applyHeroToPage(page, generationRun, options)
        : page,
    ),
  };
}
