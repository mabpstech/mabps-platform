/**
 * Sprint B3 — AI Website Generation pipeline regression checks.
 * Run: npx tsx scripts/verify-ai-generation-pipeline.ts
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sqlite } from "../lib/db";
import {
  extractJsonObject,
  generateWebsiteFromPrompt,
  isAiWebsiteBlueprint,
  mergePromptSignalsIntoProfile,
  parseAiWebsitePromptSignals,
  parseAiWebsitePromptSignalsFromContent,
  type AiWebsiteLlmProvider,
} from "../lib/website/ai";
import { inferBusinessProfile } from "../lib/website/ai/intelligence";
import {
  loadPublicSite,
  resolvePublicPage,
} from "../lib/website/public";
import { publishSite } from "../lib/website/publish";
import {
  deleteSite,
  getSiteById,
  listPages,
  listSections,
  replaceSections,
} from "../lib/website/repository";

function seedWorkspace(label: string): string {
  const workspaceId = `verify-b3-${randomUUID()}`;
  const slug = `verify-b3-${Date.now().toString(36)}-${label}`;
  sqlite
    .prepare(
      `INSERT INTO "organization" ("id", "name", "slug", "logo", "createdAt", "metadata")
       VALUES (?, ?, ?, NULL, ?, NULL)`,
    )
    .run(
      workspaceId,
      `Generation Pipeline Verify ${label}`,
      slug,
      new Date().toISOString(),
    );
  return workspaceId;
}

/** Publish-event table is CLI-migrated; ensure it exists for local verify DBs. */
function ensurePublishEventTable(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS "website_publish_event" (
      "id" text not null primary key,
      "siteId" text not null references "website_site" ("id") on delete cascade,
      "action" text not null,
      "status" text not null,
      "versionLabel" text not null,
      "actorUserId" text,
      "actorName" text,
      "note" text,
      "createdAt" text not null
    );
    CREATE INDEX IF NOT EXISTS "website_publish_event_siteId_idx"
      on "website_publish_event" ("siteId", "createdAt");
  `);
}

function cleanupWorkspace(workspaceId: string): void {
  const sites = sqlite
    .prepare(`SELECT "id" FROM "website_site" WHERE "workspaceId" = ?`)
    .all(workspaceId) as Array<{ id: string }>;
  for (const row of sites) {
    deleteSite(row.id);
  }
  sqlite.prepare(`DELETE FROM "organization" WHERE "id" = ?`).run(workspaceId);
}

// --- Validation: accepts structured signals ---
{
  const parsed = parseAiWebsitePromptSignals({
    businessName: "Aurum House",
    category: "retail",
    tone: "luxury",
    industry: "jewellery",
    suggestedPages: ["home", "products", "contact"],
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.signals?.businessName, "Aurum House");
  assert.equal(parsed.signals?.category, "retail");
}

// --- Validation: rejects Website Builder / blueprint fields ---
{
  const parsed = parseAiWebsitePromptSignals({
    businessName: "Bad Model",
    pages: [{ title: "Home", sections: [] }],
    theme: { presetId: "x" },
  });
  assert.equal(parsed.ok, false);
  assert.ok(
    parsed.issues.some((issue) => issue.message.includes("forbidden")),
  );
}

// --- Validation: invalid JSON content ---
{
  const parsed = parseAiWebsitePromptSignalsFromContent("not json at all");
  assert.equal(parsed.ok, false);
}

// --- extractJsonObject strips fences ---
{
  const raw = extractJsonObject('```json\n{"businessName":"Fence Co"}\n```');
  assert.deepEqual(raw, { businessName: "Fence Co" });
}

// --- Merge overlays LLM signals onto deterministic profile ---
{
  const base = inferBusinessProfile({
    prompt: "A neighbourhood coffee shop with warm service.",
  });
  const merged = mergePromptSignalsIntoProfile(base, {
    businessName: "Bean & Branch",
    tone: "warm",
    category: "restaurant",
  });
  assert.equal(merged.name, "Bean & Branch");
  assert.equal(merged.tone, "warm");
  assert.equal(merged.category, "restaurant");
  assert.ok((merged.confidence.name ?? 0) >= 0.9);
}

async function main() {
  // --- Pipeline: deterministic-only (skip LLM) creates editable site ---
  {
    const workspaceId = seedWorkspace("det");
    try {
      const result = await generateWebsiteFromPrompt(
        {
          workspaceId,
          prompt:
            "A luxury jewellery store specializing in handcrafted gold and diamond pieces.",
        },
        { skipLlm: true },
      );

      assert.equal(result.meta.usedLlm, false);
      assert.equal(result.meta.llmFallback, false);
      assert.equal(result.meta.heroSource, "pipeline");
      assert.equal(result.plannerMeta.usedLlm, false);
      assert.ok(result.businessPlan.pages.length >= 1);
      assert.ok(result.plannerWebsite.pages.length >= 1);
      assert.equal(result.websitePlannerMeta.usedLlm, false);
      assert.ok(result.websitePlan.pages.some((page) => page.id === "home"));
      assert.ok(result.websitePlan.navigation.includes("Home"));
      assert.ok(result.generationPlan.tasks.length >= 1);
      assert.equal(result.generationPlan.tasks[0]?.section, "Hero");
      assert.equal(
        result.generationPlan.tasks[0]?.generator,
        "hero-generator",
      );
      assert.ok(
        result.generationPlan.tasks.some(
          (task) => task.section === "Footer" && task.generator === "footer-generator",
        ),
      );
      assert.ok(result.generationRun.hero);
      assert.equal(result.generationRun.hero?.style.length > 0, true);
      assert.ok(result.generationRun.hero?.headline);
      assert.ok(
        result.generationRun.results.filter(
          (entry) =>
            entry.task.generator === "hero-generator" &&
            entry.status === "generated",
        ).length === 1,
      );
      assert.ok(
        result.generationRun.results.some(
          (entry) =>
            entry.task.generator !== "hero-generator" &&
            entry.status === "skipped",
        ),
      );
      assert.equal(isAiWebsiteBlueprint(result.blueprint), true);
      assert.ok(result.direction.artDirection.value);
      assert.ok(result.plan.requiredPages.value.length >= 1);

      const site = getSiteById(result.siteId);
      assert.ok(site);
      assert.equal(site?.workspaceId, workspaceId);
      const pages = listPages(result.siteId);
      assert.ok(pages.length >= 1);
      assert.ok(pages.some((page) => page.pageType === "home"));
      const home = pages.find((page) => page.pageType === "home");
      assert.ok(home);
      const homeSections = listSections(home!.id);
      assert.ok(homeSections.length >= 1);

      // Phase 4 — live Hero replacement: exactly one home Hero from generationRun
      const homeHeroes = homeSections.filter((section) => section.type === "hero");
      assert.equal(homeHeroes.length, 1);
      assert.ok(result.generationRun.hero);
      assert.equal(
        String(homeHeroes[0]?.content.heading ?? ""),
        result.generationRun.hero.headline,
      );
      assert.equal(
        String(homeHeroes[0]?.content.subheading ?? ""),
        result.generationRun.hero.subheadline,
      );
      assert.equal(
        String(homeHeroes[0]?.content.primaryLabel ?? ""),
        result.generationRun.hero.primaryCTA,
      );

      const blueprintHome = result.blueprint.pages.find(
        (page) => page.pageType === "home",
      );
      assert.ok(blueprintHome);
      assert.equal(
        blueprintHome!.sections.filter((section) => section.type === "hero")
          .length,
        1,
      );
      assert.equal(
        blueprintHome!.sections.find((section) => section.type === "hero")
          ?.content.heading,
        result.generationRun.hero.headline,
      );

      // About / non-home heroes stay legacy (empty shell), not generationRun
      const about = pages.find((page) => page.pageType === "about");
      if (about) {
        const aboutHero = listSections(about.id).find(
          (section) => section.type === "hero",
        );
        if (aboutHero) {
          assert.notEqual(
            String(aboutHero.content.heading ?? ""),
            result.generationRun.hero.headline,
          );
        }
      }

      // Hero survives reload (re-read from DB)
      const reloadedHome = listPages(result.siteId).find(
        (page) => page.pageType === "home",
      );
      assert.ok(reloadedHome);
      const reloadedHero = listSections(reloadedHome!.id).find(
        (section) => section.type === "hero",
      );
      assert.ok(reloadedHero);
      assert.equal(
        String(reloadedHero!.content.heading ?? ""),
        result.generationRun.hero.headline,
      );

      // Hero survives save (replaceSections round-trip)
      const savedSections = replaceSections(
        reloadedHome!.id,
        listSections(reloadedHome!.id).map((section) => ({
          id: section.id,
          type: section.type,
          content: section.content,
          settings: section.settings,
        })),
      );
      const savedHero = savedSections.find((section) => section.type === "hero");
      assert.ok(savedHero);
      assert.equal(
        String(savedHero!.content.heading ?? ""),
        result.generationRun.hero.headline,
      );
      assert.equal(
        String(savedHero!.content.subheading ?? ""),
        result.generationRun.hero.subheadline,
      );

      // Hero survives preview (draft site + preview=1)
      const draftSite = getSiteById(result.siteId);
      assert.ok(draftSite);
      const previewView = loadPublicSite(draftSite!, { preview: true });
      assert.ok(previewView);
      const previewPage = resolvePublicPage(result.siteId, [], {
        preview: true,
      });
      assert.ok(previewPage);
      const previewHero = previewPage!.sections.find(
        (section) => section.type === "hero",
      );
      assert.ok(previewHero);
      assert.equal(
        String(previewHero!.content.heading ?? ""),
        result.generationRun.hero.headline,
      );

      // Hero survives publish + public load
      ensurePublishEventTable();
      const published = publishSite(result.siteId);
      assert.equal(published.site.status, "published");
      const publicView = loadPublicSite(published.site, { preview: false });
      assert.ok(publicView);
      const publicPage = resolvePublicPage(result.siteId, [], {
        preview: false,
      });
      assert.ok(publicPage);
      const publicHero = publicPage!.sections.find(
        (section) => section.type === "hero",
      );
      assert.ok(publicHero);
      assert.equal(
        String(publicHero!.content.heading ?? ""),
        result.generationRun.hero.headline,
      );
      assert.equal(
        String(publicHero!.content.subheading ?? ""),
        result.generationRun.hero.subheadline,
      );
      assert.equal(
        String(publicHero!.content.primaryLabel ?? ""),
        result.generationRun.hero.primaryCTA,
      );
    } finally {
      cleanupWorkspace(workspaceId);
    }
  }

  // --- Pipeline: valid mock LLM signals enrich profile ---
  {
    const workspaceId = seedWorkspace("llm-ok");
    const mock: AiWebsiteLlmProvider = {
      id: "mock-ok",
      async extractPromptSignals() {
        return {
          raw: {
            businessName: "Aurum Atelier",
            category: "retail",
            tone: "luxury",
            industry: "fine jewellery",
          },
          content: JSON.stringify({
            businessName: "Aurum Atelier",
            category: "retail",
            tone: "luxury",
            industry: "fine jewellery",
          }),
          providerId: "mock-ok",
          model: "mock-model",
          usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        };
      },
    };

    try {
      const result = await generateWebsiteFromPrompt(
        {
          workspaceId,
          prompt: "Make me a jewellery website please.",
        },
        { llmProvider: mock },
      );

      assert.equal(result.meta.usedLlm, true);
      assert.equal(result.meta.llmFallback, false);
      assert.equal(result.meta.provider, "mock-ok");
      assert.equal(result.profile.name, "Aurum Atelier");
      assert.equal(result.profile.category, "retail");
      assert.ok(getSiteById(result.siteId));
    } finally {
      cleanupWorkspace(workspaceId);
    }
  }

  // --- Pipeline: invalid LLM response falls back — generation still succeeds ---
  {
    const workspaceId = seedWorkspace("llm-bad");
    const mock: AiWebsiteLlmProvider = {
      id: "mock-bad",
      async extractPromptSignals() {
        return {
          raw: {
            businessName: "Should Not Persist",
            pages: [{ title: "Home", sections: [{ type: "hero" }] }],
            header: { logoText: "Nope" },
          },
          content: '{"pages":[]}',
          providerId: "mock-bad",
          model: "mock-model",
        };
      },
    };

    try {
      const result = await generateWebsiteFromPrompt(
        {
          workspaceId,
          prompt:
            "A warm neighbourhood restaurant serving seasonal tasting menus.",
        },
        { llmProvider: mock },
      );

      assert.equal(result.meta.usedLlm, true);
      assert.equal(result.meta.llmFallback, true);
      assert.ok(result.meta.validationIssues.length > 0);
      assert.notEqual(result.profile.name, "Should Not Persist");
      assert.equal(isAiWebsiteBlueprint(result.blueprint), true);
      assert.ok(getSiteById(result.siteId));
    } finally {
      cleanupWorkspace(workspaceId);
    }
  }

  // --- Pipeline: provider throw falls back — generation still succeeds ---
  {
    const workspaceId = seedWorkspace("llm-throw");
    const mock: AiWebsiteLlmProvider = {
      id: "mock-throw",
      async extractPromptSignals() {
        throw new Error("network down");
      },
    };

    try {
      const result = await generateWebsiteFromPrompt(
        {
          workspaceId,
          prompt: "A personal brand site for a creative consultant.",
        },
        { llmProvider: mock },
      );

      assert.equal(result.meta.usedLlm, true);
      assert.equal(result.meta.llmFallback, true);
      assert.ok(
        result.meta.validationIssues.some((issue) =>
          issue.message.includes("network down"),
        ),
      );
      assert.ok(getSiteById(result.siteId));
    } finally {
      cleanupWorkspace(workspaceId);
    }
  }

  console.log("verify-ai-generation-pipeline: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
