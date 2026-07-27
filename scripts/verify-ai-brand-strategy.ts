/**
 * Sprint C4 — Brand Strategy Engine smoke checks.
 * Run: npx tsx scripts/verify-ai-brand-strategy.ts
 */

import assert from "node:assert/strict";
import {
  AI_BRAND_STRATEGY_FIELDS,
  AI_CONFIDENCE_THRESHOLD,
  createEmptyBrandStrategy,
  createEmptyBusinessDna,
  deriveBrandStrategy,
  deriveBrandStrategySync,
  inferBrandStrategy,
  inferBrandStrategyFromDna,
  inferBusinessDna,
  inferBusinessProfile,
  listBrandStrategyProviders,
} from "../lib/website/ai";

function assertEveryFieldHasConfidence(
  strategy: ReturnType<typeof inferBrandStrategy>,
): void {
  for (const key of AI_BRAND_STRATEGY_FIELDS) {
    const signal = strategy[key];
    assert.ok(signal, `missing brand strategy field: ${key}`);
    assert.equal(typeof signal.confidence, "number");
    assert.ok(signal.confidence >= 0 && signal.confidence <= 1);
    assert.ok(signal.value !== undefined && signal.value !== null);
  }
}

const cafeProfile = inferBusinessProfile({
  prompt:
    'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
});
const cafeDna = inferBusinessDna({ profile: cafeProfile });
const cafeStrategy = inferBrandStrategy({ dna: cafeDna });

assertEveryFieldHasConfidence(cafeStrategy);
assert.equal(cafeStrategy.ctaStrategy.value, cafeDna.ctaStrategy.value);
assert.equal(
  cafeStrategy.colourPsychology.value,
  cafeDna.colourPsychology.value,
);
assert.equal(
  cafeStrategy.typographyDirection.value,
  cafeDna.typographyDirection.value,
);
assert.equal(cafeStrategy.trustStrategy.value, cafeDna.trustStrategy.value);
assert.ok(
  cafeStrategy.heroMessageStrategy.value === "invitation" ||
    cafeStrategy.storytellingStrategy.value === "place_rooted",
);
assert.ok(
  cafeStrategy.conversionJourney.value === "inspire_desire_book" ||
    cafeStrategy.sectionEmphasis.value === "offer_forward",
);
assert.ok(
  cafeStrategy.emotionalJourney.confidence >= AI_CONFIDENCE_THRESHOLD ||
    cafeStrategy.voiceTone.confidence >= AI_CONFIDENCE_THRESHOLD,
);

const luxuryProfile = inferBusinessProfile({
  prompt:
    "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
});
const luxuryDna = inferBusinessDna({ profile: luxuryProfile });
const luxuryStrategy = deriveBrandStrategySync({ dna: luxuryDna });
assertEveryFieldHasConfidence(luxuryStrategy);
assert.ok(
  luxuryStrategy.brandPromise.value === "premium_experience" ||
    luxuryStrategy.uniqueValueProposition.value === "premium_quality" ||
    luxuryStrategy.photographyDirection.value === "moody_dark",
);
assert.ok(
  luxuryStrategy.illustrationStyle.value === "none" ||
    luxuryStrategy.voiceTone.value === "refined_host" ||
    luxuryStrategy.coreMessage.value === "experience_first",
);

const vagueDna = createEmptyBusinessDna();
const vagueStrategy = inferBrandStrategyFromDna(vagueDna);
assertEveryFieldHasConfidence(vagueStrategy);
assert.ok(vagueStrategy.brandPromise.confidence < AI_CONFIDENCE_THRESHOLD);

const dentalProfile = inferBusinessProfile({
  prompt: "Dental clinic in Bangalore for patients",
});
const dentalDna = inferBusinessDna({ profile: dentalProfile });
const dentalStrategy = inferBrandStrategy({ dna: dentalDna });
assert.equal(dentalStrategy.trustStrategy.value, dentalDna.trustStrategy.value);
assert.ok(
  dentalStrategy.coreMessage.value === "expertise_first" ||
    dentalStrategy.sectionEmphasis.value === "trust_forward" ||
    dentalStrategy.emotionalJourney.value === "skepticism_to_trust" ||
    dentalStrategy.emotionalJourney.value === "anxiety_to_reassurance",
);
assert.ok(
  dentalStrategy.conversionJourney.value === "learn_trust_contact" ||
    dentalStrategy.conversionJourney.value === "diagnose_advise_convert" ||
    dentalStrategy.voiceTone.value === "authoritative_expert" ||
    dentalStrategy.voiceTone.value === "refined_host",
);

const retailProfile = inferBusinessProfile({
  prompt: "Online fashion store selling clothes with product catalog",
});
const retailDna = inferBusinessDna({ profile: retailProfile });
const retailStrategy = inferBrandStrategy({ dna: retailDna });
assert.equal(retailStrategy.ctaStrategy.value, "shop_first");
assert.ok(
  retailStrategy.conversionJourney.value === "browse_compare_buy" ||
    retailStrategy.sectionEmphasis.value === "catalog_forward",
);
assert.ok(
  retailStrategy.imageStyle.value === "product_hero" ||
    retailStrategy.heroMessageStrategy.value === "offer_led",
);

const providers = listBrandStrategyProviders();
assert.ok(providers.includes("deterministic"));

const empty = createEmptyBrandStrategy();
assert.equal(empty.brandPromise.confidence, 0);
assert.equal(empty.sectionEmphasis.value, "balanced_flow");

async function main() {
  const asyncResult = await deriveBrandStrategy({ dna: cafeDna });
  assert.equal(asyncResult.providerId, "deterministic");
  assert.equal(
    asyncResult.strategy.ctaStrategy.value,
    cafeDna.ctaStrategy.value,
  );
  console.log("verify-ai-brand-strategy: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
