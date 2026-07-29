/**
 * AI Pipeline Phase 1 — Business Planner smoke checks.
 * Run: npx tsx scripts/verify-ai-business-planner.ts
 */

import assert from "node:assert/strict";
import {
  EXAMPLE_BUSINESS_PLAN,
  EXAMPLE_BUSINESS_PLANNER_PROMPT,
  inferBusinessPlan,
  parseBusinessPlan,
  parseBusinessPlanFromContent,
  planBusinessFromPrompt,
  planBusinessFromPromptSync,
  resolveBusinessPlan,
  toWebsitePlan,
  type BusinessPlannerLlmCompleter,
} from "../lib/website/ai/business-planner";

// --- Example output shape ---
{
  assert.equal(typeof EXAMPLE_BUSINESS_PLANNER_PROMPT, "string");
  assert.equal(EXAMPLE_BUSINESS_PLAN.businessType, "retail");
  assert.equal(EXAMPLE_BUSINESS_PLAN.industry, "wedding jewellery");
  assert.ok(EXAMPLE_BUSINESS_PLAN.pages.includes("home"));
  assert.ok(EXAMPLE_BUSINESS_PLAN.requiredSections.some((s) => s.role === "hero"));
  const website = toWebsitePlan(EXAMPLE_BUSINESS_PLAN);
  assert.deepEqual(website.pages, EXAMPLE_BUSINESS_PLAN.pages);
  assert.equal(
    website.requiredSections.length,
    EXAMPLE_BUSINESS_PLAN.requiredSections.length,
  );
}

// --- Deterministic inference for Kerala jewellery prompt ---
{
  const plan = inferBusinessPlan(EXAMPLE_BUSINESS_PLANNER_PROMPT);
  assert.ok(plan.businessType);
  assert.ok(plan.industry);
  assert.ok(plan.targetAudience);
  assert.ok(plan.goals.length >= 1);
  assert.ok(plan.tone);
  assert.ok(plan.style);
  assert.ok(plan.pages.includes("home"));
  assert.ok(plan.requiredSections.length >= 1);
  assert.equal(planBusinessFromPromptSync(EXAMPLE_BUSINESS_PLANNER_PROMPT).pages[0], plan.pages[0]);
}

// --- parseBusinessPlan accepts valid planner JSON ---
{
  const parsed = parseBusinessPlan({
    businessType: "retail",
    industry: "jewellery",
    targetAudience: "bridal shoppers in Kerala",
    goals: ["showcase collections", "generate enquiries"],
    tone: "luxury",
    style: "elegant",
    services: ["bridal jewellery", "custom designs"],
    pages: ["home", "products", "contact"],
    requiredSections: [
      { role: "hero", page: "home" },
      { role: "cta", page: "home" },
      "form",
    ],
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.plan?.businessType, "retail");
  assert.equal(parsed.plan?.requiredSections.length, 3);
  assert.equal(parsed.plan?.requiredSections[2]?.role, "form");
}

// --- parseBusinessPlan rejects builder/copy keys ---
{
  const parsed = parseBusinessPlan({
    businessType: "retail",
    industry: "jewellery",
    targetAudience: "couples",
    goals: ["sell"],
    tone: "luxury",
    style: "elegant",
    services: ["rings"],
    pages: ["home"],
    requiredSections: [{ role: "hero" }],
    html: "<div/>",
    copy: { headline: "Buy now" },
  });
  assert.equal(parsed.ok, false);
  assert.ok(parsed.issues.some((issue) => issue.message.includes("forbidden")));
}

// --- parseBusinessPlanFromContent handles fenced JSON ---
{
  const parsed = parseBusinessPlanFromContent(
    "```json\n" +
      JSON.stringify({
        businessType: "service_provider",
        industry: "consulting",
        targetAudience: "SMBs",
        goals: ["generate leads"],
        tone: "professional",
        style: "corporate",
        services: ["advisory"],
        pages: ["home", "about", "contact"],
        requiredSections: [{ role: "hero", page: "home" }],
      }) +
      "\n```",
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.plan?.businessType, "service_provider");
}

// --- resolveBusinessPlan falls back when LLM JSON is invalid ---
{
  const resolved = resolveBusinessPlan({
    prompt: "A neighbourhood coffee shop with warm service.",
    llmRaw: { html: "<bad/>", pages: [] },
  });
  assert.equal(resolved.fromLlm, false);
  assert.ok(resolved.validationIssues.length > 0);
  assert.ok(resolved.plan.pages.includes("home"));
}

// --- resolveBusinessPlan accepts valid LLM JSON ---
{
  const resolved = resolveBusinessPlan({
    prompt: "ignored when llm raw is valid",
    llmRaw: {
      businessType: "restaurant",
      industry: "cafe",
      targetAudience: "locals",
      goals: ["drive reservations"],
      tone: "warm",
      style: "organic",
      services: ["coffee", "pastries"],
      pages: ["home", "menu", "contact"],
      requiredSections: [{ role: "hero", page: "home" }],
    },
  });
  assert.equal(resolved.fromLlm, true);
  assert.equal(resolved.plan.businessType, "restaurant");
}

async function main() {
  // --- Async planner with skipLlm ---
  {
    const result = await planBusinessFromPrompt(
      { prompt: EXAMPLE_BUSINESS_PLANNER_PROMPT },
      { skipLlm: true },
    );
    assert.equal(result.meta.usedLlm, false);
    assert.ok(result.plan.pages.length >= 1);
    assert.deepEqual(result.website.pages, result.plan.pages);
  }

  // --- Async planner with mock LLM completer ---
  {
    const mock: BusinessPlannerLlmCompleter = async () => ({
      content: JSON.stringify({
        businessType: "retail",
        industry: "fine jewellery",
        targetAudience: "luxury bridal shoppers",
        goals: ["showcase products"],
        tone: "luxury",
        style: "elegant",
        services: ["bridal sets"],
        pages: ["home", "collections", "contact"],
        requiredSections: [
          { role: "hero", page: "home" },
          { role: "gallery", page: "home" },
        ],
      }),
      raw: {
        businessType: "retail",
        industry: "fine jewellery",
        targetAudience: "luxury bridal shoppers",
        goals: ["showcase products"],
        tone: "luxury",
        style: "elegant",
        services: ["bridal sets"],
        pages: ["home", "collections", "contact"],
        requiredSections: [
          { role: "hero", page: "home" },
          { role: "gallery", page: "home" },
        ],
      },
      providerId: "mock-planner",
      model: "mock-model",
      usage: { inputTokens: 5, outputTokens: 10, totalTokens: 15 },
    });

    const result = await planBusinessFromPrompt(
      { prompt: EXAMPLE_BUSINESS_PLANNER_PROMPT },
      { completeJson: mock },
    );
    assert.equal(result.meta.usedLlm, true);
    assert.equal(result.meta.llmFallback, false);
    assert.equal(result.meta.provider, "mock-planner");
    assert.equal(result.plan.industry, "fine jewellery");
  }

  // --- Mock LLM failure falls back ---
  {
    const mock: BusinessPlannerLlmCompleter = async () => {
      throw new Error("planner network down");
    };
    const result = await planBusinessFromPrompt(
      { prompt: "A warm neighbourhood restaurant." },
      { completeJson: mock },
    );
    assert.equal(result.meta.usedLlm, true);
    assert.equal(result.meta.llmFallback, true);
    assert.ok(
      result.meta.validationIssues.some((issue) =>
        issue.message.includes("planner network down"),
      ),
    );
    assert.ok(result.plan.pages.includes("home"));
  }

  console.log("verify-ai-business-planner: ok");
  console.log(
    "example plan:",
    JSON.stringify(EXAMPLE_BUSINESS_PLAN, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
