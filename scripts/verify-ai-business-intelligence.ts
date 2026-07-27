/**
 * Sprint C2 — Business Intelligence Layer smoke checks.
 * Run: npx tsx scripts/verify-ai-business-intelligence.ts
 */

import assert from "node:assert/strict";
import {
  AI_CONFIDENCE_THRESHOLD,
  analyzeBusinessPrompt,
  analyzeBusinessPromptSync,
  createEmptyBusinessProfile,
  inferBusinessProfile,
  listBusinessIntelligenceProviders,
  parseAiWebsiteBlueprint,
  createEmptyBlueprint,
} from "../lib/website/ai";

const cafe = inferBusinessProfile({
  prompt:
    'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
});

assert.equal(cafe.name, "Spice Garden");
assert.equal(cafe.category, "restaurant");
assert.equal(cafe.industry, "restaurant");
assert.equal(cafe.businessType, "restaurant");
assert.equal(cafe.country, "IN");
assert.equal(cafe.region, "Kerala");
assert.ok((cafe.confidence.category ?? 0) >= AI_CONFIDENCE_THRESHOLD);
assert.ok(cafe.suggestedPages.includes("home"));
assert.ok(cafe.suggestedPages.includes("contact"));
assert.ok(cafe.contactPreferences.includes("whatsapp"));
assert.ok(cafe.contactPreferences.includes("booking"));
assert.ok(cafe.seoKeywords.length > 0);
assert.ok(cafe.primaryCta);

const vague = inferBusinessProfile({ prompt: "make me a website" });
assert.equal(vague.category, null);
assert.ok((vague.confidence.category ?? 1) < AI_CONFIDENCE_THRESHOLD);
assert.equal(vague.name, "New website");

const luxury = analyzeBusinessPromptSync({
  prompt: "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
});
assert.equal(luxury.category, "retail");
assert.equal(luxury.country, "AE");
assert.ok(
  luxury.tone === "luxury" || luxury.visualStyle === "elegant" || luxury.colourDirection === "dark_luxury",
);

const withOptions = inferBusinessProfile({
  prompt: "A local business site",
  options: { category: "services", tone: "professional", locale: "en-IN" },
});
assert.equal(withOptions.category, "services");
assert.equal(withOptions.tone, "professional");
assert.equal(withOptions.language, "en");
assert.equal(withOptions.country, "IN");
assert.equal(withOptions.confidence.category, 1);

const providers = listBusinessIntelligenceProviders();
assert.ok(providers.includes("deterministic"));

const empty = createEmptyBusinessProfile("Acme");
assert.equal(empty.name, "Acme");
assert.deepEqual(empty.confidence, {});

const blueprint = createEmptyBlueprint({
  brand: cafe,
  pages: [
    {
      title: "Home",
      slug: "home",
      pageType: "home",
      seoTitle: null,
      seoDescription: null,
      sections: [],
    },
  ],
});
const parsed = parseAiWebsiteBlueprint(blueprint);
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.blueprint.brand.category, "restaurant");
  assert.equal(parsed.blueprint.brand.region, "Kerala");
}

async function main() {
  const asyncResult = await analyzeBusinessPrompt({
    prompt: "Dental clinic in Bangalore for patients",
  });
  assert.equal(asyncResult.providerId, "deterministic");
  assert.equal(asyncResult.profile.category, "professional");
  assert.equal(asyncResult.profile.region, "Karnataka");
  console.log("verify-ai-business-intelligence: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
