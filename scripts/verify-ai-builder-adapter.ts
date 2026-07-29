/**
 * AI Pipeline Phase 3.5–4 — Builder Adapter + Live Hero replacement smoke checks.
 * Run: npx tsx scripts/verify-ai-builder-adapter.ts
 */

import assert from "node:assert/strict";
import {
  DEFAULT_PRIMARY_HREF,
  DEFAULT_SECONDARY_HREF,
  EXAMPLE_BUILDER_HERO_SECTION,
  EXAMPLE_BUILDER_JSON,
  EXAMPLE_GENERATION_RUN_WITH_HERO,
  HERO_LAYOUT_TO_BUILDER,
  HERO_STYLE_TO_BUILDER,
  adaptGenerationRun,
  adaptGenerationRunToBuilder,
  adaptHeroContent,
  adaptHeroToBuilderSection,
  adapterOptionsFromLegacyHero,
  applyHeroToBlueprint,
  applyHeroToPage,
  replaceHeroInSections,
  type BuilderHeroContent,
  type BuilderSectionJson,
} from "../lib/website/ai/builder-adapter";
import {
  EXAMPLE_HERO_SECTION,
  type HeroSectionContent,
} from "../lib/website/ai/generators/hero";
import type { GenerationRunResult } from "../lib/website/ai/orchestrator";
import type {
  AiGeneratedPage,
  AiWebsiteBlueprint,
} from "../lib/website/ai/types";
import { defaultSectionContent } from "../components/website/section-defaults";

const BUILDER_HERO_KEYS = Object.keys(
  defaultSectionContent("hero"),
).sort();

function assertBuilderHeroContent(content: Record<string, unknown>) {
  const keys = Object.keys(content).sort();
  assert.deepEqual(
    keys,
    BUILDER_HERO_KEYS,
    "Adapted hero must match existing Builder hero schema keys",
  );
  assert.equal(typeof content.heading, "string");
  assert.equal(typeof content.subheading, "string");
  assert.equal(typeof content.primaryLabel, "string");
  assert.equal(typeof content.primaryHref, "string");
  assert.ok(["left", "center", "right"].includes(String(content.align)));
  assert.ok(["sm", "md", "lg", "xl"].includes(String(content.height)));
  assert.ok(["none", "fade", "rise"].includes(String(content.animation)));
  assert.equal(content.backgroundMediaId, null);
  assert.equal(content.desktopMediaId, null);
  assert.equal(content.mobileMediaId, null);
  assert.equal(content.backgroundVideoUrl, "");
  assert.equal("imagePrompt" in content, false);
  assert.equal("headline" in content, false);
  assert.equal("primaryCTA" in content, false);
}

// --- Lexicon covers every generator layout/style ---
{
  assert.deepEqual(Object.keys(HERO_LAYOUT_TO_BUILDER).sort(), [
    "center",
    "fullscreen",
    "split-left",
    "split-right",
  ]);
  assert.deepEqual(Object.keys(HERO_STYLE_TO_BUILDER).sort(), [
    "corporate",
    "healthcare",
    "luxury",
    "minimal",
    "modern",
    "restaurant",
    "spiritual",
  ]);
}

// --- Example jewellery hero → Builder hero ---
{
  assert.equal(EXAMPLE_BUILDER_HERO_SECTION.type, "hero");
  assertBuilderHeroContent(EXAMPLE_BUILDER_HERO_SECTION.content);
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.heading,
    EXAMPLE_HERO_SECTION.headline,
  );
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.subheading,
    EXAMPLE_HERO_SECTION.subheadline,
  ); // generator subheadline → Builder subheading
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.primaryLabel,
    EXAMPLE_HERO_SECTION.primaryCTA,
  );
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.secondaryLabel,
    EXAMPLE_HERO_SECTION.secondaryCTA,
  );
  assert.equal(EXAMPLE_BUILDER_HERO_SECTION.content.align, "left");
  assert.equal(EXAMPLE_BUILDER_HERO_SECTION.content.height, "lg");
  assert.equal(EXAMPLE_BUILDER_HERO_SECTION.content.overlay, 45);
  assert.equal(EXAMPLE_BUILDER_HERO_SECTION.content.animation, "fade");
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.primaryHref,
    DEFAULT_PRIMARY_HREF,
  );
  assert.equal(
    EXAMPLE_BUILDER_HERO_SECTION.content.secondaryHref,
    DEFAULT_SECONDARY_HREF,
  );
}

// --- adaptHeroContent field mapping ---
{
  const content = adaptHeroContent(EXAMPLE_HERO_SECTION);
  assertBuilderHeroContent(content as unknown as Record<string, unknown>);
  assert.equal(content.eyebrow, "");
}

// --- secondary CTA optional ---
{
  const withoutSecondary: HeroSectionContent = {
    ...EXAMPLE_HERO_SECTION,
    secondaryCTA: undefined,
  };
  const content = adaptHeroContent(withoutSecondary);
  assert.equal(content.secondaryLabel, "");
  assert.equal(content.secondaryHref, "");
}

// --- href overrides ---
{
  const content = adaptHeroContent(EXAMPLE_HERO_SECTION, {
    primaryHref: "/book",
    secondaryHref: "/collections",
  });
  assert.equal(content.primaryHref, "/book");
  assert.equal(content.secondaryHref, "/collections");
}

// --- layout variants ---
{
  const cases: Array<{
    layout: HeroSectionContent["layout"];
    align: BuilderHeroContent["align"];
    height: BuilderHeroContent["height"];
  }> = [
    { layout: "split-left", align: "left", height: "lg" },
    { layout: "split-right", align: "right", height: "lg" },
    { layout: "center", align: "center", height: "md" },
    { layout: "fullscreen", align: "center", height: "xl" },
  ];
  for (const item of cases) {
    const content = adaptHeroContent({
      ...EXAMPLE_HERO_SECTION,
      layout: item.layout,
    });
    assert.equal(content.align, item.align, item.layout);
    assert.equal(content.height, item.height, item.layout);
  }
}

// --- generationRun → Builder JSON (hero only) ---
{
  const json = adaptGenerationRunToBuilder(EXAMPLE_GENERATION_RUN_WITH_HERO);
  assert.equal(json.sections.length, 1);
  assert.equal(json.sections[0]?.type, "hero");
  assertBuilderHeroContent(json.sections[0]!.content);
  assert.deepEqual(json, EXAMPLE_BUILDER_JSON);

  const viaInput = adaptGenerationRun({
    generationRun: EXAMPLE_GENERATION_RUN_WITH_HERO,
  });
  assert.deepEqual(viaInput, json);
}

// --- empty hero → empty sections ---
{
  const emptyRun: GenerationRunResult = {
    plan: { tasks: [] },
    results: [
      {
        task: {
          page: "home",
          section: "Testimonials",
          generator: "testimonial-generator",
        },
        status: "skipped",
        skipReason: "not implemented",
      },
    ],
    hero: null,
    heroMeta: null,
  };
  const json = adaptGenerationRunToBuilder(emptyRun);
  assert.deepEqual(json, { sections: [] });
}

// --- ignores non-hero results even when present alongside hero ---
{
  const run: GenerationRunResult = {
    ...EXAMPLE_GENERATION_RUN_WITH_HERO,
    results: [
      ...EXAMPLE_GENERATION_RUN_WITH_HERO.results,
      {
        task: {
          page: "home",
          section: "FAQ",
          generator: "faq-generator",
        },
        status: "skipped",
        skipReason: "Phase 3 hero only",
      },
    ],
  };
  const json = adaptGenerationRunToBuilder(run);
  assert.equal(json.sections.length, 1);
  assert.equal(json.sections[0]?.type, "hero");
}

// --- settings passthrough ---
{
  const section = adaptHeroToBuilderSection(EXAMPLE_HERO_SECTION, {
    heroSettings: { paddingY: "lg" },
  });
  assert.deepEqual(section.settings, { paddingY: "lg" });
}

// --- Phase 4: replaceHeroInSections keeps exactly one hero ---
{
  const legacyHero: BuilderSectionJson = {
    type: "hero",
    content: {
      ...defaultSectionContent("hero"),
      heading: "Legacy",
      primaryHref: "/shop",
    },
  };
  const features: BuilderSectionJson = {
    type: "features",
    content: { heading: "Features stay", items: [] },
  };
  const cta: BuilderSectionJson = {
    type: "cta",
    content: { heading: "CTA stays", body: "", buttonLabel: "", buttonHref: "/" },
  };
  const duplicateHero: BuilderSectionJson = {
    type: "hero",
    content: { ...defaultSectionContent("hero"), heading: "Extra" },
  };
  const adapted = adaptHeroToBuilderSection(EXAMPLE_HERO_SECTION, {
    primaryHref: "/shop",
  });

  const replaced = replaceHeroInSections(
    [legacyHero, features, duplicateHero, cta],
    adapted,
  );
  assert.equal(replaced.filter((s) => s.type === "hero").length, 1);
  assert.equal(replaced[0]?.type, "hero");
  assert.equal(replaced[0]?.content.heading, EXAMPLE_HERO_SECTION.headline);
  assert.equal(replaced[1]?.type, "features");
  assert.equal(replaced[1]?.content.heading, "Features stay");
  assert.equal(replaced[2]?.type, "cta");
  assert.equal(replaced[2]?.content.heading, "CTA stays");
}

// --- Phase 4: insert hero when missing ---
{
  const features: BuilderSectionJson = {
    type: "features",
    content: { heading: "Only features", items: [] },
  };
  const adapted = adaptHeroToBuilderSection(EXAMPLE_HERO_SECTION);
  const replaced = replaceHeroInSections([features], adapted);
  assert.equal(replaced.length, 2);
  assert.equal(replaced[0]?.type, "hero");
  assert.equal(replaced[1]?.type, "features");
}

// --- Phase 4: legacy options preserve CTA hrefs / settings ---
{
  const legacy: BuilderSectionJson = {
    type: "hero",
    content: {
      ...defaultSectionContent("hero"),
      primaryHref: "/book",
      secondaryHref: "/menu",
    },
    settings: { paddingY: "xl" },
  };
  const opts = adapterOptionsFromLegacyHero(legacy);
  assert.equal(opts.primaryHref, "/book");
  assert.equal(opts.secondaryHref, "/menu");
  assert.deepEqual(opts.heroSettings, { paddingY: "xl" });
}

// --- Phase 4: applyHeroToBlueprint replaces home only; fallback when no hero ---
{
  const home: AiGeneratedPage = {
    title: "Home",
    slug: "home",
    pageType: "home",
    seoTitle: null,
    seoDescription: null,
    sections: [
      {
        type: "hero",
        content: {
          ...defaultSectionContent("hero"),
          heading: "Legacy Home",
          primaryHref: "/contact",
          secondaryHref: "/about",
        },
        settings: { paddingY: "lg" },
      },
      {
        type: "features",
        content: { heading: "Why us", items: [{ title: "A", description: "B" }] },
      },
      {
        type: "cta",
        content: {
          heading: "Ready?",
          body: "",
          buttonLabel: "Go",
          buttonHref: "/contact",
        },
      },
    ],
  };
  const about: AiGeneratedPage = {
    title: "About",
    slug: "about",
    pageType: "about",
    seoTitle: null,
    seoDescription: null,
    sections: [
      {
        type: "hero",
        content: { ...defaultSectionContent("hero"), heading: "About Legacy" },
      },
      { type: "richText", content: { html: "<p>Story</p>" } },
    ],
  };
  const blueprint = {
    version: 1,
    intent: {},
    site: { name: "Test", slug: "test" },
    brand: {},
    theme: { presetId: null, tokens: {} },
    header: {},
    footer: {},
    seo: {},
    pages: [home, about],
    navigation: [],
  } as unknown as AiWebsiteBlueprint;

  const withHero = applyHeroToBlueprint(
    blueprint,
    EXAMPLE_GENERATION_RUN_WITH_HERO,
  );
  assert.equal(withHero.source, "pipeline");
  const homePage = withHero.blueprint.pages.find(
    (page) => page.pageType === "home",
  )!;
  const aboutPage = withHero.blueprint.pages.find(
    (page) => page.pageType === "about",
  )!;
  const homeHeroes = homePage.sections.filter((s) => s.type === "hero");
  assert.equal(homeHeroes.length, 1);
  assert.equal(homeHeroes[0]?.content.heading, EXAMPLE_HERO_SECTION.headline);
  assert.equal(homeHeroes[0]?.content.primaryHref, "/contact");
  assert.deepEqual(homeHeroes[0]?.settings, { paddingY: "lg" });
  assert.equal(
    homePage.sections.find((s) => s.type === "features")?.content.heading,
    "Why us",
  );
  assert.equal(
    homePage.sections.find((s) => s.type === "cta")?.content.heading,
    "Ready?",
  );
  assert.equal(
    aboutPage.sections.find((s) => s.type === "hero")?.content.heading,
    "About Legacy",
  );
  assert.deepEqual(aboutPage.sections, about.sections);

  const emptyRun: GenerationRunResult = {
    plan: { tasks: [] },
    results: [],
    hero: null,
    heroMeta: null,
  };
  const fallback = applyHeroToBlueprint(blueprint, emptyRun);
  assert.equal(fallback.source, "fallback");
  assert.equal(
    fallback.blueprint.pages
      .find((page) => page.pageType === "home")
      ?.sections.find((s) => s.type === "hero")?.content.heading,
    "Legacy Home",
  );

  const viaPage = applyHeroToPage(home, EXAMPLE_GENERATION_RUN_WITH_HERO);
  assert.equal(
    viaPage.sections.filter((s) => s.type === "hero").length,
    1,
  );
}

console.log("verify-ai-builder-adapter: ok");
