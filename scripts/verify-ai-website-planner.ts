/**
 * AI Pipeline Phase 2 — Website Planner smoke checks.
 * Run: npx tsx scripts/verify-ai-website-planner.ts
 */

import assert from "node:assert/strict";
import {
  EXAMPLE_BUSINESS_PLAN,
  inferBusinessPlan,
} from "../lib/website/ai/business-planner";
import {
  EXAMPLE_WEBSITE_PLAN,
  EXAMPLE_WEBSITE_PLANNER_BUSINESS_PLAN,
  inferWebsitePlanFromBusinessPlan,
  parseWebsitePlan,
  parseWebsitePlanFromContent,
  planWebsiteFromBusinessPlan,
  planWebsiteFromBusinessPlanSync,
  resolveWebsiteStructurePlan,
  type WebsitePlannerLlmCompleter,
} from "../lib/website/ai/website-planner";

// --- Example output shape ---
{
  assert.ok(EXAMPLE_WEBSITE_PLAN.navigation.includes("Home"));
  assert.ok(EXAMPLE_WEBSITE_PLAN.navigation.includes("Collections"));
  assert.ok(EXAMPLE_WEBSITE_PLAN.pages.some((page) => page.id === "home"));
  const home = EXAMPLE_WEBSITE_PLAN.pages.find((page) => page.id === "home");
  assert.ok(home?.sections.includes("Hero"));
  assert.ok(EXAMPLE_WEBSITE_PLAN.footerLinks.length >= 1);
  assert.ok(EXAMPLE_WEBSITE_PLAN.contentRequirements.length >= 1);
  assert.equal(
    EXAMPLE_WEBSITE_PLANNER_BUSINESS_PLAN.industry,
    EXAMPLE_BUSINESS_PLAN.industry,
  );
}

// --- Deterministic jewellery structure ---
{
  const plan = inferWebsitePlanFromBusinessPlan(EXAMPLE_BUSINESS_PLAN);
  assert.ok(plan.navigation.includes("Collections"));
  assert.ok(plan.navigation.includes("Custom Orders"));
  assert.ok(plan.pages.some((page) => page.id === "collections"));
  assert.ok(plan.pages.some((page) => page.id === "custom-orders"));
  assert.ok(plan.pages.some((page) => page.id === "home"));
  assert.deepEqual(
    planWebsiteFromBusinessPlanSync(EXAMPLE_BUSINESS_PLAN).navigation,
    plan.navigation,
  );
}

// --- Industry intelligence: restaurant vs hospital vs meditation ---
{
  const restaurant = inferWebsitePlanFromBusinessPlan({
    businessType: "restaurant",
    industry: "cafe",
    targetAudience: "locals",
    goals: ["drive reservations"],
    tone: "warm",
    style: "organic",
    services: ["coffee", "pastries"],
    pages: ["home", "menu", "contact"],
    requiredSections: [{ role: "hero", page: "home" }],
  });
  assert.ok(restaurant.navigation.includes("Menu"));
  assert.ok(restaurant.navigation.includes("Reservations"));
  assert.ok(restaurant.pages.some((page) => page.id === "menu"));

  const hospital = inferWebsitePlanFromBusinessPlan({
    businessType: "professional_practice",
    industry: "hospital",
    targetAudience: "patients",
    goals: ["book appointments"],
    tone: "professional",
    style: "corporate",
    services: ["emergency", "outpatient"],
    pages: ["home", "doctors", "contact"],
    requiredSections: [{ role: "hero", page: "home" }],
  });
  assert.ok(hospital.navigation.includes("Doctors"));
  assert.ok(hospital.navigation.includes("Appointments"));
  assert.ok(hospital.pages.some((page) => page.id === "departments"));

  const meditation = inferWebsitePlanFromBusinessPlan({
    businessType: "service_provider",
    industry: "meditation centre",
    targetAudience: "seekers",
    goals: ["promote programs"],
    tone: "calm",
    style: "minimal",
    services: ["guided meditation", "retreats"],
    pages: ["home", "programs", "contact"],
    requiredSections: [{ role: "hero", page: "home" }],
  });
  assert.ok(meditation.navigation.includes("Programs"));
  assert.ok(meditation.navigation.includes("Events"));
  assert.ok(meditation.pages.some((page) => page.id === "meditation"));
}

// --- parseWebsitePlan accepts valid planner JSON ---
{
  const parsed = parseWebsitePlan({
    navigation: ["Home", "About", "Contact"],
    pages: [
      { id: "home", sections: ["Hero", "CTA"] },
      { id: "about", sections: ["Hero", "Story"] },
      { id: "contact", sections: ["Form"] },
    ],
    footerLinks: ["Home", "Contact", "Privacy"],
    contentRequirements: ["business name", "contact details"],
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.plan?.pages[0]?.id, "home");
  assert.equal(parsed.plan?.pages[0]?.sections[0], "Hero");
}

// --- parseWebsitePlan rejects copy/visual/builder keys ---
{
  const parsed = parseWebsitePlan({
    navigation: ["Home"],
    pages: [{ id: "home", sections: ["Hero"] }],
    footerLinks: ["Home"],
    contentRequirements: ["business name"],
    html: "<div/>",
    copy: { headline: "Buy now" },
    colours: { primary: "#000" },
  });
  assert.equal(parsed.ok, false);
  assert.ok(parsed.issues.some((issue) => issue.message.includes("forbidden")));
}

// --- parseWebsitePlanFromContent handles fenced JSON ---
{
  const parsed = parseWebsitePlanFromContent(
    "```json\n" +
      JSON.stringify({
        navigation: ["Home", "Services", "Contact"],
        pages: [
          { id: "home", sections: ["Hero", "Services", "CTA"] },
          { id: "services", sections: ["Hero", "Services"] },
          { id: "contact", sections: ["Form"] },
        ],
        footerLinks: ["Home", "Contact"],
        contentRequirements: ["service list"],
      }) +
      "\n```",
  );
  assert.equal(parsed.ok, true);
  assert.ok(parsed.plan?.navigation.includes("Services"));
}

// --- resolveWebsiteStructurePlan falls back when LLM JSON is invalid ---
{
  const businessPlan = inferBusinessPlan(
    "A neighbourhood coffee shop with warm service.",
  );
  const resolved = resolveWebsiteStructurePlan({
    businessPlan,
    llmRaw: { html: "<bad/>", navigation: [] },
  });
  assert.equal(resolved.fromLlm, false);
  assert.ok(resolved.validationIssues.length > 0);
  assert.ok(resolved.plan.pages.some((page) => page.id === "home"));
}

// --- resolveWebsiteStructurePlan accepts valid LLM JSON ---
{
  const resolved = resolveWebsiteStructurePlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    llmRaw: {
      navigation: ["Home", "Menu", "Contact"],
      pages: [
        { id: "home", sections: ["Hero", "Menu Preview", "CTA"] },
        { id: "menu", sections: ["Hero", "Menu"] },
        { id: "contact", sections: ["Form"] },
      ],
      footerLinks: ["Home", "Menu", "Contact"],
      contentRequirements: ["menu categories", "contact details"],
    },
  });
  assert.equal(resolved.fromLlm, true);
  assert.ok(resolved.plan.navigation.includes("Menu"));
}

async function main() {
  // --- Async planner with skipLlm ---
  {
    const result = await planWebsiteFromBusinessPlan(
      { businessPlan: EXAMPLE_BUSINESS_PLAN },
      { skipLlm: true },
    );
    assert.equal(result.meta.usedLlm, false);
    assert.ok(result.plan.pages.length >= 1);
    assert.ok(result.plan.navigation.includes("Home"));
  }

  // --- Async planner with mock LLM completer ---
  {
    const mock: WebsitePlannerLlmCompleter = async () => ({
      content: JSON.stringify({
        navigation: ["Home", "Collections", "Contact"],
        pages: [
          { id: "home", sections: ["Hero", "Gallery", "CTA"] },
          { id: "collections", sections: ["Hero", "Gallery"] },
          { id: "contact", sections: ["Form"] },
        ],
        footerLinks: ["Home", "Collections", "Contact"],
        contentRequirements: ["collection imagery"],
      }),
      raw: {
        navigation: ["Home", "Collections", "Contact"],
        pages: [
          { id: "home", sections: ["Hero", "Gallery", "CTA"] },
          { id: "collections", sections: ["Hero", "Gallery"] },
          { id: "contact", sections: ["Form"] },
        ],
        footerLinks: ["Home", "Collections", "Contact"],
        contentRequirements: ["collection imagery"],
      },
      providerId: "mock-website-planner",
      model: "mock-model",
      usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 },
    });

    const result = await planWebsiteFromBusinessPlan(
      { businessPlan: EXAMPLE_BUSINESS_PLAN },
      { completeJson: mock },
    );
    assert.equal(result.meta.usedLlm, true);
    assert.equal(result.meta.llmFallback, false);
    assert.equal(result.meta.provider, "mock-website-planner");
    assert.deepEqual(result.plan.navigation, [
      "Home",
      "Collections",
      "Contact",
    ]);
  }

  // --- Mock LLM failure falls back ---
  {
    const mock: WebsitePlannerLlmCompleter = async () => {
      throw new Error("website planner network down");
    };
    const businessPlan = inferBusinessPlan("A warm neighbourhood restaurant.");
    const result = await planWebsiteFromBusinessPlan(
      { businessPlan, prompt: "A warm neighbourhood restaurant." },
      { completeJson: mock },
    );
    assert.equal(result.meta.usedLlm, true);
    assert.equal(result.meta.llmFallback, true);
    assert.ok(
      result.meta.validationIssues.some((issue) =>
        issue.message.includes("website planner network down"),
      ),
    );
    assert.ok(result.plan.pages.some((page) => page.id === "home"));
    assert.ok(result.plan.navigation.includes("Menu"));
  }

  console.log("verify-ai-website-planner: ok");
  console.log("example plan:", JSON.stringify(EXAMPLE_WEBSITE_PLAN, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
