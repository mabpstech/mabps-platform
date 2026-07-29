/**
 * AI Pipeline Phase 3 — Hero generator smoke checks.
 * Run: npx tsx scripts/verify-ai-hero-generator.ts
 */

import assert from "node:assert/strict";
import { EXAMPLE_BUSINESS_PLAN } from "../lib/website/ai/business-planner";
import {
  EXAMPLE_HERO_SECTION,
  EXAMPLE_HERO_TASK,
  HERO_HEADLINE_MAX_WORDS,
  HERO_LAYOUTS,
  HERO_STYLES,
  HERO_SUBHEADLINE_MAX_WORDS,
  countWords,
  generateHero,
  generateHeroSync,
  inferHeroSection,
  parseHeroSection,
  parseHeroSectionFromContent,
  resolveHeroSection,
  type HeroGeneratorLlmCompleter,
  type HeroSectionContent,
} from "../lib/website/ai/generators/hero";
import {
  createGenerationPlan,
  runGenerationPlan,
} from "../lib/website/ai/orchestrator";
import {
  EXAMPLE_WEBSITE_PLAN,
  inferWebsitePlanFromBusinessPlan,
} from "../lib/website/ai/website-planner";

function assertHeroRules(content: HeroSectionContent) {
  assert.ok(content.headline.trim());
  assert.ok(countWords(content.headline) <= HERO_HEADLINE_MAX_WORDS);
  assert.ok(!/^welcome\s+to\b/i.test(content.headline));
  assert.ok(content.subheadline.trim());
  assert.ok(countWords(content.subheadline) <= HERO_SUBHEADLINE_MAX_WORDS);
  assert.ok(content.primaryCTA.trim());
  assert.ok(content.imagePrompt.trim());
  assert.ok((HERO_LAYOUTS as readonly string[]).includes(content.layout));
  assert.ok((HERO_STYLES as readonly string[]).includes(content.style));
  assert.equal(
    Object.keys(content).every((key) =>
      [
        "headline",
        "subheadline",
        "primaryCTA",
        "secondaryCTA",
        "imagePrompt",
        "layout",
        "style",
      ].includes(key),
    ),
    true,
  );
}

// --- Example contract shape ---
{
  assert.equal(EXAMPLE_HERO_TASK.generator, "hero-generator");
  assertHeroRules(EXAMPLE_HERO_SECTION);
  assert.equal(EXAMPLE_HERO_SECTION.layout, "split-left");
  assert.equal(EXAMPLE_HERO_SECTION.style, "luxury");
}

// --- Deterministic jewellery → luxury ---
{
  const content = inferHeroSection({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: EXAMPLE_WEBSITE_PLAN,
    task: EXAMPLE_HERO_TASK,
  });
  assertHeroRules(content);
  assert.equal(content.style, "luxury");
  assert.equal(content.layout, "split-left");
  assert.ok(content.primaryCTA.length > 0);
  assert.ok(content.imagePrompt.toLowerCase().includes("luxury"));
}

// --- Sync generateHeroSync ---
{
  const a = generateHeroSync(
    EXAMPLE_BUSINESS_PLAN,
    EXAMPLE_WEBSITE_PLAN,
    EXAMPLE_HERO_TASK,
  );
  const b = generateHeroSync(
    EXAMPLE_BUSINESS_PLAN,
    EXAMPLE_WEBSITE_PLAN,
    EXAMPLE_HERO_TASK,
  );
  assert.deepEqual(a, b);
  assertHeroRules(a);
}

// --- parseHeroSection accepts valid JSON ---
{
  const parsed = parseHeroSection({
    headline: "Bridal gold crafted for lasting wedding moments",
    subheadline:
      "Handcrafted bridal sets and personal showroom guidance for families seeking heirloom quality.",
    primaryCTA: "Book a private viewing",
    secondaryCTA: "View bridal sets",
    imagePrompt:
      "Luxury Kerala jewellery showroom with elegant bridal gold collection, cinematic lighting",
    layout: "split-left",
    style: "luxury",
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assertHeroRules(parsed.content);
}

// --- parseHeroSection rejects HTML / welcome / word overflow ---
{
  const forbidden = parseHeroSection({
    headline: "Hello",
    subheadline: "Value",
    primaryCTA: "Go",
    imagePrompt: "Scene",
    layout: "split-left",
    style: "luxury",
    html: "<h1>no</h1>",
  });
  assert.equal(forbidden.ok, false);

  const welcome = parseHeroSection({
    headline: "Welcome to our jewellery boutique today",
    subheadline: "We offer bridal gold for Kerala wedding celebrations.",
    primaryCTA: "Shop now",
    imagePrompt: "Showroom",
    layout: "center",
    style: "luxury",
  });
  assert.equal(welcome.ok, false);

  const tooLong = parseHeroSection({
    headline:
      "One two three four five six seven eight nine ten eleven twelve thirteen",
    subheadline: "Short value line for the brand.",
    primaryCTA: "Shop now",
    imagePrompt: "Showroom",
    layout: "center",
    style: "luxury",
  });
  assert.equal(tooLong.ok, false);
}

// --- parseHeroSectionFromContent handles fenced JSON ---
{
  const parsed = parseHeroSectionFromContent(
    '```json\n{"headline":"Clear care for every patient visit","subheadline":"Modern clinic support with empathy and clarity for families.","primaryCTA":"Book an appointment","imagePrompt":"Calm clinic interior","layout":"split-left","style":"healthcare"}\n```',
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.content.style, "healthcare");
    assertHeroRules(parsed.content);
  }
}

// --- resolveHeroSection falls back on invalid LLM ---
{
  const resolved = resolveHeroSection({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: EXAMPLE_WEBSITE_PLAN,
    task: EXAMPLE_HERO_TASK,
    llmRaw: { html: "<div/>", headline: "x" },
  });
  assert.equal(resolved.fromLlm, false);
  assert.ok(resolved.validationIssues.length >= 1);
  assertHeroRules(resolved.content);
}

async function main() {
  // --- generateHero skipLlm ---
  {
    const result = await generateHero(
      {
        businessPlan: EXAMPLE_BUSINESS_PLAN,
        websitePlan: EXAMPLE_WEBSITE_PLAN,
        task: EXAMPLE_HERO_TASK,
      },
      { skipLlm: true },
    );
    assert.equal(result.meta.usedLlm, false);
    assertHeroRules(result.content);
  }

  // --- generateHero with mock LLM ---
  {
    const mock: HeroGeneratorLlmCompleter = async () => ({
      content: JSON.stringify({
        headline: "Heirloom bridal gold for Kerala celebrations",
        subheadline:
          "Private consultations help couples choose lasting pieces with confidence.",
        primaryCTA: "Book a viewing",
        secondaryCTA: "Browse collections",
        imagePrompt:
          "Luxury Kerala jewellery showroom with elegant bridal gold collection, cinematic lighting",
        layout: "split-left",
        style: "luxury",
      }),
      raw: {
        headline: "Heirloom bridal gold for Kerala celebrations",
        subheadline:
          "Private consultations help couples choose lasting pieces with confidence.",
        primaryCTA: "Book a viewing",
        secondaryCTA: "Browse collections",
        imagePrompt:
          "Luxury Kerala jewellery showroom with elegant bridal gold collection, cinematic lighting",
        layout: "split-left",
        style: "luxury",
      },
      providerId: "mock",
      model: "mock-model",
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    });

    const result = await generateHero(
      {
        businessPlan: EXAMPLE_BUSINESS_PLAN,
        websitePlan: EXAMPLE_WEBSITE_PLAN,
        task: EXAMPLE_HERO_TASK,
      },
      { completeJson: mock },
    );
    assert.equal(result.meta.usedLlm, true);
    assert.equal(result.meta.llmFallback, false);
    assert.equal(result.meta.provider, "mock");
    assert.equal(
      result.content.headline,
      "Heirloom bridal gold for Kerala celebrations",
    );
    assertHeroRules(result.content);
  }

  // --- Orchestrator dispatches hero only ---
  {
    const websitePlan = inferWebsitePlanFromBusinessPlan(EXAMPLE_BUSINESS_PLAN);
    const plan = createGenerationPlan({
      businessPlan: EXAMPLE_BUSINESS_PLAN,
      websitePlan,
    });
    const run = await runGenerationPlan(
      {
        businessPlan: EXAMPLE_BUSINESS_PLAN,
        websitePlan,
        plan,
      },
      { skipLlm: true },
    );

    assert.ok(run.hero);
    assertHeroRules(run.hero);
    const heroResults = run.results.filter(
      (result) =>
        result.task.generator === "hero-generator" &&
        result.status === "generated",
    );
    assert.equal(heroResults.length, 1);
    assert.equal(heroResults[0]?.task.page, "home");
    const deferredHeroes = run.results.filter(
      (result) =>
        result.task.generator === "hero-generator" &&
        result.status === "skipped",
    );
    assert.ok(deferredHeroes.length >= 0);
    const skipped = run.results.filter(
      (result) => result.task.generator !== "hero-generator",
    );
    assert.ok(skipped.length >= 1);
    assert.ok(skipped.every((result) => result.status === "skipped"));
  }

  // --- Reject non-hero task ---
  {
    await assert.rejects(
      () =>
        generateHero(
          {
            businessPlan: EXAMPLE_BUSINESS_PLAN,
            websitePlan: EXAMPLE_WEBSITE_PLAN,
            task: {
              page: "home",
              section: "FAQ",
              generator: "faq-generator",
            },
          },
          { skipLlm: true },
        ),
      /hero-generator/,
    );
  }

  console.log("verify-ai-hero-generator: ok");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
