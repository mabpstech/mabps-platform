/**
 * Sprint C3 — Business DNA Layer smoke checks.
 * Run: npx tsx scripts/verify-ai-business-dna.ts
 */

import assert from "node:assert/strict";
import {
  AI_BUSINESS_DNA_FIELDS,
  AI_CONFIDENCE_THRESHOLD,
  createEmptyBusinessDna,
  createEmptyBusinessProfile,
  deriveBusinessDna,
  deriveBusinessDnaSync,
  inferBusinessDna,
  inferBusinessDnaFromProfile,
  inferBusinessProfile,
  listBusinessDnaProviders,
} from "../lib/website/ai";

function assertEveryFieldHasConfidence(
  dna: ReturnType<typeof inferBusinessDna>,
): void {
  for (const key of AI_BUSINESS_DNA_FIELDS) {
    const signal = dna[key];
    assert.ok(signal, `missing DNA field: ${key}`);
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

assertEveryFieldHasConfidence(cafeDna);
assert.equal(cafeDna.heroStrategy.value, "atmosphere");
assert.equal(cafeDna.ctaStrategy.value, "book_first");
assert.equal(cafeDna.conversionStrategy.value, "booking_first");
assert.equal(cafeDna.imageDirection.value, "food");
assert.ok(
  cafeDna.localGlobal.value === "hyperlocal" ||
    cafeDna.localGlobal.value === "local",
);
assert.ok(cafeDna.sectionPriority.value.includes("hero"));
assert.ok(cafeDna.sectionPriority.value[0] === "hero");
assert.ok(cafeDna.emotionalStyle.confidence >= AI_CONFIDENCE_THRESHOLD);

const luxuryProfile = inferBusinessProfile({
  prompt:
    "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
});
const luxuryDna = deriveBusinessDnaSync({ profile: luxuryProfile });
assertEveryFieldHasConfidence(luxuryDna);
assert.ok(
  luxuryDna.priceSegment.value === "luxury" ||
    luxuryDna.luxuryFriendly.value === "luxury" ||
    luxuryDna.colourPsychology.value === "luxury_dark",
);
assert.ok(
  luxuryDna.visualIdentity.value === "elegant_refined" ||
    luxuryDna.typographyDirection.value === "classic_serif",
);

const vagueProfile = createEmptyBusinessProfile();
const vagueDna = inferBusinessDnaFromProfile(vagueProfile);
assertEveryFieldHasConfidence(vagueDna);
assert.ok(vagueDna.brandPosition.confidence < AI_CONFIDENCE_THRESHOLD);

const dentalProfile = inferBusinessProfile({
  prompt: "Dental clinic in Bangalore for patients",
});
const dentalDna = inferBusinessDna({ profile: dentalProfile });
assert.equal(dentalDna.trustStrategy.value, "credentials");
assert.ok(
  dentalDna.ctaStrategy.value === "contact_first" ||
    dentalDna.conversionStrategy.value === "consultative",
);
assert.ok(
  dentalDna.formalCasual.value === "formal" ||
    dentalDna.formalCasual.value === "polished",
);

const retailProfile = inferBusinessProfile({
  prompt: "Online fashion store selling clothes with product catalog",
});
const retailDna = inferBusinessDna({ profile: retailProfile });
assert.equal(retailDna.ctaStrategy.value, "shop_first");
assert.equal(retailDna.heroStrategy.value, "product_focus");
assert.ok(retailDna.sectionPriority.value.includes("products"));

const providers = listBusinessDnaProviders();
assert.ok(providers.includes("deterministic"));

const empty = createEmptyBusinessDna();
assert.equal(empty.brandPosition.confidence, 0);
assert.deepEqual(empty.sectionPriority.value[0], "hero");

async function main() {
  const asyncResult = await deriveBusinessDna({ profile: cafeProfile });
  assert.equal(asyncResult.providerId, "deterministic");
  assert.equal(asyncResult.dna.imageDirection.value, "food");
  console.log("verify-ai-business-dna: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
