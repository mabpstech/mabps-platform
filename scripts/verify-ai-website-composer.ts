/**
 * Sprint C6 — Website Composer smoke checks.
 * Run: npx tsx scripts/verify-ai-website-composer.ts
 */

import assert from "node:assert/strict";
import {
  SECTION_TYPES,
  type SectionType,
} from "../lib/website/types";
import {
  composeWebsite,
  composeWebsiteBlueprint,
  composeWebsiteBlueprintFromInputs,
  composeWebsiteSync,
  countBlueprintSections,
  createEmptyBrandStrategy,
  createEmptyBusinessDna,
  createEmptyBusinessProfile,
  createEmptyWebsitePlan,
  inferBrandStrategy,
  inferBusinessDna,
  inferBusinessProfile,
  inferWebsitePlan,
  listWebsiteComposerProviders,
  parseAiWebsiteBlueprint,
  ROLE_TO_SECTION_TYPE,
} from "../lib/website/ai";

function pipeline(prompt: string) {
  const profile = inferBusinessProfile({ prompt });
  const dna = inferBusinessDna({ profile });
  const strategy = inferBrandStrategy({ dna });
  const plan = inferWebsitePlan({ profile, dna, strategy });
  const blueprint = composeWebsiteBlueprint({
    profile,
    dna,
    strategy,
    plan,
    prompt,
  });
  return { profile, dna, strategy, plan, blueprint };
}

function assertValidBlueprint(
  blueprint: ReturnType<typeof composeWebsiteBlueprint>,
  label: string,
): void {
  const parsed = parseAiWebsiteBlueprint(blueprint);
  assert.equal(parsed.ok, true, `${label}: blueprint must validate`);
  assert.ok(blueprint.pages.length >= 1, `${label}: at least one page`);
  assert.equal(blueprint.pages[0].pageType, "home");
  assert.ok(
    blueprint.pages.some((page) => page.pageType === "home"),
    `${label}: home page required`,
  );

  for (const page of blueprint.pages) {
    assert.ok(page.sections.length >= 1, `${label}: ${page.pageType} sections`);
    for (const section of page.sections) {
      assert.ok(
        (SECTION_TYPES as readonly string[]).includes(section.type),
        `${label}: invalid section type ${section.type}`,
      );
    }
  }

  // No marketing copy invented in hero headings.
  const home = blueprint.pages.find((page) => page.pageType === "home");
  assert.ok(home);
  const hero = home.sections.find((section) => section.type === "hero");
  assert.ok(hero, `${label}: home hero required`);
  assert.equal(hero.content.heading, "", `${label}: no hero copy`);
  assert.equal(typeof hero.content.primaryHref, "string");
}

for (const role of Object.keys(ROLE_TO_SECTION_TYPE) as Array<
  keyof typeof ROLE_TO_SECTION_TYPE
>) {
  const type = ROLE_TO_SECTION_TYPE[role] as SectionType;
  assert.ok((SECTION_TYPES as readonly string[]).includes(type));
}

const cafe = pipeline(
  'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
);
assertValidBlueprint(cafe.blueprint, "cafe");
assert.equal(cafe.blueprint.brand.name, "Spice Garden");
assert.ok(cafe.blueprint.theme.presetId);
assert.ok(
  cafe.blueprint.pages.some((page) =>
    page.sections.some((section) => section.type === "cta"),
  ) ||
    cafe.blueprint.pages
      .find((page) => page.pageType === "home")
      ?.sections.some((section) => section.type === "form"),
);
assert.ok(countBlueprintSections(cafe.blueprint) >= 3);

const luxury = pipeline(
  "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
);
assertValidBlueprint(luxury.blueprint, "luxury");
assert.ok(
  luxury.blueprint.theme.presetId === "luxury-black" ||
    luxury.blueprint.theme.presetId === "elegant-gold" ||
    luxury.plan.requiredPages.value.includes("products"),
);
assert.ok(
  luxury.blueprint.pages.some((page) => page.pageType === "products") ||
    luxury.blueprint.pages
      .find((page) => page.pageType === "home")
      ?.sections.some(
        (section) =>
          section.type === "products" || section.type === "collections",
      ),
);

const dental = pipeline("Dental clinic in Bangalore for patients");
assertValidBlueprint(dental.blueprint, "dental");
assert.ok(
  dental.blueprint.header.ctaHref === "/contact" ||
    dental.blueprint.pages.some((page) => page.pageType === "contact"),
);
const dentalHome = dental.blueprint.pages.find(
  (page) => page.pageType === "home",
);
assert.ok(dentalHome);
assert.ok(
  dentalHome.sections.some((section) => section.type === "features") ||
    dentalHome.sections.some((section) => section.type === "form"),
);

const retail = pipeline(
  "Online fashion store selling clothes with product catalog",
);
assertValidBlueprint(retail.blueprint, "retail");
assert.ok(retail.blueprint.pages.some((page) => page.pageType === "products"));
assert.equal(retail.blueprint.intent.template, "catalog");

const vague = composeWebsiteBlueprintFromInputs(
  createEmptyBusinessProfile(),
  createEmptyBusinessDna(),
  createEmptyBrandStrategy(),
  createEmptyWebsitePlan(),
);
assertValidBlueprint(vague, "vague");
assert.ok(vague.pages.length >= 1);

// Density → spacing strategy lands in section settings.
const sparseDna = inferBusinessDna({
  profile: inferBusinessProfile({
    prompt: "Minimal boutique consultancy website",
  }),
});
const sparsePlan = inferWebsitePlan({
  profile: inferBusinessProfile({
    prompt: "Minimal boutique consultancy website",
  }),
  dna: sparseDna,
  strategy: inferBrandStrategy({ dna: sparseDna }),
});
const sparseBlueprint = composeWebsiteBlueprint({
  profile: inferBusinessProfile({
    prompt: "Minimal boutique consultancy website",
  }),
  dna: sparseDna,
  strategy: inferBrandStrategy({ dna: sparseDna }),
  plan: sparsePlan,
  prompt: "Minimal boutique consultancy website",
});
assertValidBlueprint(sparseBlueprint, "sparse");
const padded = sparseBlueprint.pages
  .flatMap((page) => page.sections)
  .filter((section) => section.settings?.paddingY);
assert.ok(padded.length > 0, "spacing strategy should set paddingY");

// Image placeholders present when visual priorities apply.
const galleryOrImage = cafe.blueprint.pages.some((page) =>
  page.sections.some(
    (section) => section.type === "gallery" || section.type === "image",
  ),
);
assert.ok(
  galleryOrImage ||
    cafe.blueprint.pages
      .find((page) => page.pageType === "home")
      ?.sections.some((section) => section.type === "hero"),
);

const providers = listWebsiteComposerProviders();
assert.ok(providers.includes("deterministic"));

const syncBlueprint = composeWebsiteSync({
  profile: cafe.profile,
  dna: cafe.dna,
  strategy: cafe.strategy,
  plan: cafe.plan,
  prompt: "Spice Garden",
});
assert.deepEqual(
  syncBlueprint.pages.map((page) => page.pageType),
  cafe.blueprint.pages.map((page) => page.pageType),
);

async function main() {
  const asyncResult = await composeWebsite({
    profile: cafe.profile,
    dna: cafe.dna,
    strategy: cafe.strategy,
    plan: cafe.plan,
    prompt: "Spice Garden",
  });
  assert.equal(asyncResult.providerId, "deterministic");
  const parsed = parseAiWebsiteBlueprint(asyncResult.blueprint);
  assert.equal(parsed.ok, true);
  console.log("verify-ai-website-composer: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
