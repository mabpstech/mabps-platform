/**
 * AI Pipeline Phase 2.5 — Generation Orchestrator smoke checks.
 * Run: npx tsx scripts/verify-ai-orchestrator.ts
 */

import assert from "node:assert/strict";
import { EXAMPLE_BUSINESS_PLAN } from "../lib/website/ai/business-planner";
import {
  EXAMPLE_GENERATION_PLAN_HOME_SLICE,
  EXAMPLE_ORCHESTRATOR_BUSINESS_PLAN,
  EXAMPLE_ORCHESTRATOR_WEBSITE_PLAN,
  SECTION_TO_GENERATOR,
  createGenerationPlan,
  resolveGeneratorId,
  type GenerationPlan,
} from "../lib/website/ai/orchestrator";
import {
  EXAMPLE_WEBSITE_PLAN,
  inferWebsitePlanFromBusinessPlan,
} from "../lib/website/ai/website-planner";

// --- Example contract shape ---
{
  assert.equal(
    EXAMPLE_ORCHESTRATOR_BUSINESS_PLAN.industry,
    EXAMPLE_BUSINESS_PLAN.industry,
  );
  assert.deepEqual(
    EXAMPLE_ORCHESTRATOR_WEBSITE_PLAN.pages[0]?.sections.slice(0, 6),
    EXAMPLE_GENERATION_PLAN_HOME_SLICE.tasks.map((task) => task.section),
  );
  assert.equal(
    EXAMPLE_GENERATION_PLAN_HOME_SLICE.tasks[0]?.generator,
    "hero-generator",
  );
  assert.equal(
    EXAMPLE_GENERATION_PLAN_HOME_SLICE.tasks.find(
      (task) => task.section === "Testimonials",
    )?.generator,
    "testimonial-generator",
  );
}

// --- Generator id mapping ---
{
  assert.equal(resolveGeneratorId("Hero"), "hero-generator");
  assert.equal(resolveGeneratorId("Testimonials"), "testimonial-generator");
  assert.equal(resolveGeneratorId("FAQ"), "faq-generator");
  assert.equal(resolveGeneratorId("CTA"), "cta-generator");
  assert.equal(resolveGeneratorId("Footer"), "footer-generator");
  assert.equal(
    resolveGeneratorId("Featured Collections"),
    "featured-collections-generator",
  );
  assert.equal(resolveGeneratorId("Custom Widget"), "custom-widget-generator");
  assert.ok(SECTION_TO_GENERATOR.hero);
}

// --- Queue from example WebsitePlan ---
{
  const plan = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: EXAMPLE_WEBSITE_PLAN,
  });

  assert.ok(plan.tasks.length >= 1);
  assert.deepEqual(plan.tasks[0], {
    page: "home",
    section: "Hero",
    generator: "hero-generator",
  });

  const homeTasks = plan.tasks.filter((task) => task.page === "home");
  assert.deepEqual(
    homeTasks.map((task) => task.section),
    EXAMPLE_WEBSITE_PLAN.pages.find((page) => page.id === "home")?.sections,
  );

  const testimonials = plan.tasks.find(
    (task) => task.page === "home" && task.section === "Testimonials",
  );
  assert.deepEqual(testimonials, {
    page: "home",
    section: "Testimonials",
    generator: "testimonial-generator",
  });

  // Page order preserved: home before collections
  const firstCollections = plan.tasks.findIndex(
    (task) => task.page === "collections",
  );
  const lastHome = plan.tasks
    .map((task, index) => (task.page === "home" ? index : -1))
    .filter((index) => index >= 0)
    .at(-1);
  assert.ok(typeof lastHome === "number");
  assert.ok(firstCollections > lastHome);

  // Footer appended once when footerLinks exist
  const footerTasks = plan.tasks.filter((task) => task.section === "Footer");
  assert.equal(footerTasks.length, 1);
  assert.deepEqual(footerTasks[0], {
    page: "site",
    section: "Footer",
    generator: "footer-generator",
  });
  assert.equal(plan.tasks.at(-1)?.section, "Footer");
}

// --- Deterministic: same inputs → identical plan ---
{
  const websitePlan = inferWebsitePlanFromBusinessPlan(EXAMPLE_BUSINESS_PLAN);
  const a = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan,
  });
  const b = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan,
  });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
}

// --- No footerLinks → no Footer task ---
{
  const plan = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: {
      navigation: ["Home"],
      pages: [{ id: "home", sections: ["Hero", "CTA"] }],
      footerLinks: [],
      contentRequirements: [],
    },
  });
  assert.deepEqual(plan.tasks, [
    { page: "home", section: "Hero", generator: "hero-generator" },
    { page: "home", section: "CTA", generator: "cta-generator" },
  ]);
  assert.ok(!plan.tasks.some((task) => task.section === "Footer"));
}

// --- Empty / whitespace sections skipped ---
{
  const plan = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: {
      navigation: ["Home"],
      pages: [{ id: "home", sections: ["Hero", "  ", "", "CTA"] }],
      footerLinks: ["Home"],
      contentRequirements: [],
    },
  });
  assert.deepEqual(
    plan.tasks.map((task) => task.section),
    ["Hero", "CTA", "Footer"],
  );
}

// --- Does not invent content fields ---
{
  const plan: GenerationPlan = createGenerationPlan({
    businessPlan: EXAMPLE_BUSINESS_PLAN,
    websitePlan: EXAMPLE_WEBSITE_PLAN,
  });
  for (const task of plan.tasks) {
    assert.equal(Object.keys(task).sort().join(","), "generator,page,section");
    assert.equal(typeof task.page, "string");
    assert.equal(typeof task.section, "string");
    assert.equal(typeof task.generator, "string");
    assert.ok(task.generator.endsWith("-generator"));
  }
}

console.log("verify-ai-orchestrator: ok");
