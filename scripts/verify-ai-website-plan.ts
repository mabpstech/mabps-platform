/**
 * Sprint C5 — Website Planning Engine smoke checks.
 * Run: npx tsx scripts/verify-ai-website-plan.ts
 */

import assert from "node:assert/strict";
import {
  AI_CONFIDENCE_THRESHOLD,
  AI_WEBSITE_PLAN_FIELDS,
  createEmptyBrandStrategy,
  createEmptyBusinessDna,
  createEmptyBusinessProfile,
  createEmptyWebsitePlan,
  deriveWebsitePlan,
  deriveWebsitePlanSync,
  inferBrandStrategy,
  inferBusinessDna,
  inferBusinessProfile,
  inferWebsitePlan,
  inferWebsitePlanFromInputs,
  listWebsitePlanProviders,
} from "../lib/website/ai";

function assertEveryFieldHasConfidence(
  plan: ReturnType<typeof inferWebsitePlan>,
): void {
  for (const key of AI_WEBSITE_PLAN_FIELDS) {
    const signal = plan[key];
    assert.ok(signal, `missing website plan field: ${key}`);
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
  return { profile, dna, strategy, plan };
}

const cafe = pipeline(
  'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
);
assertEveryFieldHasConfidence(cafe.plan);
assert.ok(cafe.plan.requiredPages.value.includes("home"));
assert.ok(cafe.plan.requiredPages.value.includes("contact"));
assert.equal(cafe.plan.pageOrder.value[0], "home");
assert.ok(
  cafe.plan.websitePurpose.value === "book_appointments" ||
    cafe.plan.ctaFlow.value === "book_path" ||
    cafe.plan.conversionFlow.value === "home_to_book",
);
assert.ok(
  cafe.plan.userJourney.value === "land_inspire_book" ||
    cafe.plan.navigationStructure.value.ctaPage === "contact",
);
assert.ok(cafe.plan.sectionPriority.value.includes("hero"));
assert.ok(!("sections" in cafe.plan));

const luxury = pipeline(
  "Luxury jewellery boutique in Dubai for affluent shoppers, elegant dark theme",
);
assertEveryFieldHasConfidence(luxury.plan);
assert.ok(
  luxury.plan.websitePurpose.value === "drive_sales" ||
    luxury.plan.websitePurpose.value === "showcase_brand" ||
    luxury.plan.requiredPages.value.includes("products"),
);
assert.ok(
  luxury.plan.conversionFlow.value === "home_to_catalog_to_purchase" ||
    luxury.plan.ctaFlow.value === "shop_path" ||
    luxury.plan.navigationStructure.value.pattern === "catalog_forward",
);

const vaguePlan = inferWebsitePlanFromInputs(
  createEmptyBusinessProfile(),
  createEmptyBusinessDna(),
  createEmptyBrandStrategy(),
);
assertEveryFieldHasConfidence(vaguePlan);
assert.ok(vaguePlan.websitePurpose.confidence < AI_CONFIDENCE_THRESHOLD);

const dental = pipeline("Dental clinic in Bangalore for patients");
assertEveryFieldHasConfidence(dental.plan);
assert.ok(
  dental.plan.websitePurpose.value === "book_appointments" ||
    dental.plan.websitePurpose.value === "build_authority" ||
    dental.plan.trustBuildingFlow.value === "credentials_first" ||
    dental.plan.userJourney.value === "land_learn_trust_contact",
);
assert.ok(
  dental.plan.conversionFlow.value === "home_to_about_to_contact" ||
    dental.plan.conversionFlow.value === "home_to_offer_to_contact" ||
    dental.plan.seoPriorities.value.includes("local_presence"),
);

const retail = pipeline(
  "Online fashion store selling clothes with product catalog",
);
assertEveryFieldHasConfidence(retail.plan);
assert.ok(retail.plan.requiredPages.value.includes("products"));
assert.equal(retail.plan.ctaFlow.value, "shop_path");
assert.ok(
  retail.plan.websitePurpose.value === "drive_sales" ||
    retail.plan.conversionFlow.value === "home_to_catalog_to_purchase",
);
assert.ok(
  retail.plan.contentPriorities.value.includes("offer_clarity") ||
    retail.plan.contentPriorities.value.includes("visual_showcase"),
);

const providers = listWebsitePlanProviders();
assert.ok(providers.includes("deterministic"));

const empty = createEmptyWebsitePlan();
assert.equal(empty.websitePurpose.confidence, 0);
assert.equal(empty.pageOrder.value[0], "home");
assert.deepEqual(empty.requiredPages.value, ["home", "about", "contact"]);

const syncPlan = deriveWebsitePlanSync({
  profile: cafe.profile,
  dna: cafe.dna,
  strategy: cafe.strategy,
});
assert.equal(syncPlan.websitePurpose.value, cafe.plan.websitePurpose.value);
assert.deepEqual(syncPlan.pageOrder.value, cafe.plan.pageOrder.value);

async function main() {
  const asyncResult = await deriveWebsitePlan({
    profile: cafe.profile,
    dna: cafe.dna,
    strategy: cafe.strategy,
  });
  assert.equal(asyncResult.providerId, "deterministic");
  assert.equal(
    asyncResult.plan.ctaFlow.value,
    cafe.dna.ctaStrategy.value === "book_first"
      ? "book_path"
      : asyncResult.plan.ctaFlow.value,
  );
  console.log("verify-ai-website-plan: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
