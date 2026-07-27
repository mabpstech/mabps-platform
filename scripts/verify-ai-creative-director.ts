/**
 * Sprint C7 — Creative Director Engine smoke checks.
 * Run: npx tsx scripts/verify-ai-creative-director.ts
 */

import assert from "node:assert/strict";
import {
  AI_CONFIDENCE_THRESHOLD,
  AI_CREATIVE_DIRECTION_FIELDS,
  createEmptyBrandStrategy,
  createEmptyBusinessDna,
  createEmptyCreativeDirection,
  createEmptyWebsitePlan,
  deriveCreativeDirection,
  deriveCreativeDirectionSync,
  inferBrandStrategy,
  inferBusinessDna,
  inferBusinessProfile,
  inferCreativeDirection,
  inferCreativeDirectionFromInputs,
  inferWebsitePlan,
  listCreativeDirectorProviders,
} from "../lib/website/ai";

function assertEveryFieldHasConfidence(
  direction: ReturnType<typeof inferCreativeDirection>,
): void {
  for (const key of AI_CREATIVE_DIRECTION_FIELDS) {
    const signal = direction[key];
    assert.ok(signal, `missing creative direction field: ${key}`);
    assert.equal(typeof signal.confidence, "number");
    assert.ok(signal.confidence >= 0 && signal.confidence <= 1);
    assert.ok(signal.value !== undefined && signal.value !== null);
  }
}

function pipeline(prompt: string) {
  const profile = inferBusinessProfile({ prompt });
  const dna = inferBusinessDna({ profile });
  const strategy = inferBrandStrategy({ dna });
  const plan = inferWebsitePlan({ profile, dna, strategy });
  const direction = inferCreativeDirection({ dna, strategy, plan });
  return { profile, dna, strategy, plan, direction };
}

const cafe = pipeline(
  'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
);
assertEveryFieldHasConfidence(cafe.direction);
assert.ok(
  cafe.direction.artDirection.value === "warm_human" ||
    cafe.direction.artDirection.value === "organic_natural" ||
    cafe.direction.firstImpression.value === "warm_welcome",
);
assert.ok(
  cafe.direction.heroComposition.value === "cinematic_wide" ||
    cafe.direction.heroComposition.value === "full_bleed_centered" ||
    cafe.direction.visualStorytelling.value === "atmosphere_immersion",
);
assert.ok(!("pages" in cafe.direction));
assert.ok(!("sections" in cafe.direction));
assert.ok(!("blueprint" in cafe.direction));

const luxury = pipeline(
  "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
);
assertEveryFieldHasConfidence(luxury.direction);
assert.ok(
  luxury.direction.premiumLevel.value === "ultra_luxury" ||
    luxury.direction.premiumLevel.value === "premium" ||
    luxury.direction.artDirection.value === "refined_luxury",
);
assert.ok(
  luxury.direction.whitespaceStrategy.value === "luxury_void" ||
    luxury.direction.finalCtaEmotion.value === "exclusive_access" ||
    luxury.direction.finalCtaEmotion.value === "aspirational_pull",
);

const vague = inferCreativeDirectionFromInputs(
  createEmptyBusinessDna(),
  createEmptyBrandStrategy(),
  createEmptyWebsitePlan(),
);
assertEveryFieldHasConfidence(vague);
assert.ok(
  vague.artDirection.confidence < AI_CONFIDENCE_THRESHOLD ||
    vague.premiumLevel.confidence < AI_CONFIDENCE_THRESHOLD,
);

const dental = pipeline("Dental clinic in Bangalore for patients");
assertEveryFieldHasConfidence(dental.direction);
assert.ok(
  dental.direction.firstImpression.value === "trust_first" ||
    dental.direction.firstImpression.value === "calm_authority" ||
    dental.direction.artDirection.value === "corporate_clear" ||
    dental.direction.finalCtaEmotion.value === "reassuring_safety" ||
    dental.direction.finalCtaEmotion.value === "practical_next_step",
);

const retail = pipeline(
  "Online fashion store selling clothes with product catalog",
);
assertEveryFieldHasConfidence(retail.direction);
assert.ok(
  retail.direction.visualStorytelling.value === "product_spotlight_chain" ||
    retail.direction.visualStorytelling.value === "offer_ladder" ||
    retail.direction.heroComposition.value === "product_stage" ||
    retail.direction.sectionPacing.value === "quick_scan" ||
    retail.direction.sectionPacing.value === "dense_catalog",
);

// Image / photo / illustration / icon come from brand strategy.
assert.equal(
  retail.direction.imageStyle.value,
  retail.strategy.imageStyle.value,
);
assert.equal(
  retail.direction.photographyDirection.value,
  retail.strategy.photographyDirection.value,
);
assert.equal(
  retail.direction.illustrationDirection.value,
  retail.strategy.illustrationStyle.value,
);
assert.equal(retail.direction.iconStyle.value, retail.strategy.iconStyle.value);
assert.equal(
  retail.direction.emotionalProgression.value,
  retail.strategy.emotionalJourney.value,
);

const providers = listCreativeDirectorProviders();
assert.ok(providers.includes("deterministic"));

const empty = createEmptyCreativeDirection();
assert.equal(empty.artDirection.confidence, 0);
assert.equal(empty.premiumLevel.value, "polished");

const syncDirection = deriveCreativeDirectionSync({
  dna: cafe.dna,
  strategy: cafe.strategy,
  plan: cafe.plan,
});
assert.equal(
  syncDirection.artDirection.value,
  cafe.direction.artDirection.value,
);
assert.equal(
  syncDirection.heroComposition.value,
  cafe.direction.heroComposition.value,
);

async function main() {
  const asyncResult = await deriveCreativeDirection({
    dna: cafe.dna,
    strategy: cafe.strategy,
    plan: cafe.plan,
  });
  assert.equal(asyncResult.providerId, "deterministic");
  assert.equal(
    asyncResult.direction.artDirection.value,
    cafe.direction.artDirection.value,
  );
  console.log("verify-ai-creative-director: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
