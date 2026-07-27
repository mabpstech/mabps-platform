/**
 * Sprint B1 — Blueprint Executor regression checks.
 * Run: npx tsx scripts/verify-ai-blueprint-executor.ts
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sqlite } from "../lib/db";
import {
  composeWebsiteBlueprint,
  countBlueprintSections,
  executeWebsiteBlueprint,
  inferBrandStrategy,
  inferBusinessDna,
  inferBusinessProfile,
  inferWebsitePlan,
  isAiWebsiteBlueprint,
  parseAiWebsiteBlueprint,
} from "../lib/website/ai";
import {
  countSitesForWorkspace,
  deleteSite,
  getFooterBySiteId,
  getHeaderBySiteId,
  getSeoBySiteId,
  getSiteById,
  getThemeBySiteId,
  listNavItems,
  listPages,
  listSections,
} from "../lib/website/repository";
import { createWorkspaceSite } from "../lib/website/sites";

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

function seedWorkspace(label: string): string {
  const workspaceId = `verify-b1-${randomUUID()}`;
  const slug = `verify-b1-${Date.now().toString(36)}-${label}`;
  sqlite
    .prepare(
      `INSERT INTO "organization" ("id", "name", "slug", "logo", "createdAt", "metadata")
       VALUES (?, ?, ?, NULL, ?, NULL)`,
    )
    .run(
      workspaceId,
      `Blueprint Executor Verify ${label}`,
      slug,
      new Date().toISOString(),
    );
  return workspaceId;
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

// --- Happy path: composer blueprint → full Website Builder project ---
{
  const workspaceId = seedWorkspace("ok");
  try {
    const { blueprint } = pipeline(
      'Create a warm website for "Spice Garden" a family restaurant in Kochi, Kerala India with online reservations and WhatsApp',
    );
    assert.equal(isAiWebsiteBlueprint(blueprint), true);
    assert.ok(blueprint.pages.some((page) => page.pageType === "home"));

    const result = executeWebsiteBlueprint({ workspaceId, blueprint });
    assert.ok(result.siteId);
    assert.equal(result.site.workspaceId, workspaceId);
    assert.equal(result.site.name, blueprint.site.name);

    const pages = listPages(result.siteId);
    assert.equal(pages.length, blueprint.pages.length);
    assert.ok(pages.some((page) => page.pageType === "home"));

    for (const bp of blueprint.pages) {
      const page = pages.find((entry) => entry.slug === bp.slug);
      assert.ok(page, `missing page slug ${bp.slug}`);
      assert.equal(page.title, bp.title);
      assert.equal(page.seoTitle, bp.seoTitle);
      assert.equal(page.seoDescription, bp.seoDescription);
      const sections = listSections(page.id);
      assert.equal(sections.length, bp.sections.length);
      sections.forEach((section, index) => {
        assert.equal(section.type, bp.sections[index].type);
        if (bp.sections[index].settings) {
          for (const [key, value] of Object.entries(
            bp.sections[index].settings!,
          )) {
            assert.equal(
              (section.settings as Record<string, unknown>)[key],
              value,
              `section settings.${key} on ${bp.slug}`,
            );
          }
        }
      });
      assert.equal(result.pageIdsBySlug[bp.slug], page.id);
    }

    const header = getHeaderBySiteId(result.siteId)!;
    assert.equal(header.logoText, blueprint.header.logoText);
    assert.equal(header.ctaLabel, blueprint.header.ctaLabel);
    assert.equal(header.ctaHref, blueprint.header.ctaHref);
    assert.equal(header.ctaStyle, blueprint.header.ctaStyle);

    const footer = getFooterBySiteId(result.siteId)!;
    assert.equal(footer.copyrightText, blueprint.footer.copyrightText);
    assert.equal(footer.showSocial, blueprint.footer.showSocial);
    assert.equal(footer.columns.length, blueprint.footer.columns.length);

    const seo = getSeoBySiteId(result.siteId)!;
    assert.equal(seo.defaultTitle, blueprint.seo.defaultTitle);
    assert.equal(seo.defaultDescription, blueprint.seo.defaultDescription);
    assert.equal(seo.robots, blueprint.seo.robots);

    const theme = getThemeBySiteId(result.siteId)!;
    if (blueprint.theme.presetId) {
      assert.equal(theme.tokens.presetId, blueprint.theme.presetId);
    }
    assert.equal(theme.tokens.brand.businessName, blueprint.brand.name);

    const nav = listNavItems(result.siteId);
    assert.ok(nav.length >= 1, "navigation must be created");
    assert.equal(result.navigation.length, nav.length);

    const totalSections = Object.values(result.sectionsByPageId).reduce(
      (sum, list) => sum + list.length,
      0,
    );
    assert.equal(totalSections, countBlueprintSections(blueprint));

    const parsed = parseAiWebsiteBlueprint(blueprint);
    assert.equal(parsed.ok, true);

    console.log("verify-ai-blueprint-executor: happy path ok");
    console.log(
      `  site=${result.site.slug} pages=${pages.length} sections=${totalSections} nav=${nav.length}`,
    );
  } finally {
    cleanupWorkspace(workspaceId);
  }
}

// --- Atomic rollback: nested createSite + throw must leave no site ---
{
  const workspaceId = seedWorkspace("rollback");
  try {
    const before = countSitesForWorkspace(workspaceId);
    let createdId: string | null = null;
    assert.throws(() => {
      sqlite.transaction(() => {
        const site = createWorkspaceSite({
          workspaceId,
          name: "Rollback Probe",
          slug: `rollback-probe-${Date.now().toString(36)}`,
          template: "classic",
          category: "restaurant",
        });
        createdId = site.id;
        assert.ok(getSiteById(site.id), "site visible inside txn");
        throw new Error("forced blueprint executor rollback");
      })();
    }, /forced blueprint executor rollback/);

    assert.equal(
      countSitesForWorkspace(workspaceId),
      before,
      "failed txn must roll back site create",
    );
    assert.equal(getSiteById(createdId!), null);
    console.log("verify-ai-blueprint-executor: rollback ok");
  } finally {
    cleanupWorkspace(workspaceId);
  }
}

// --- Mid-apply failure rolls back the whole executeWebsiteBlueprint ---
{
  const workspaceId = seedWorkspace("midfail");
  try {
    const { blueprint } = pipeline(
      "Dental clinic website in London for family care appointments",
    );
    const before = countSitesForWorkspace(workspaceId);

    const dup = structuredClone(blueprint);
    const nonHome = dup.pages.filter((page) => page.pageType !== "home");
    assert.ok(nonHome.length >= 2, "need two non-home pages for slug clash");
    nonHome[1].slug = nonHome[0].slug;

    assert.throws(() => {
      executeWebsiteBlueprint({ workspaceId, blueprint: dup });
    }, /slug already exists/i);

    assert.equal(
      countSitesForWorkspace(workspaceId),
      before,
      "executeWebsiteBlueprint must roll back on mid-apply failure",
    );
    console.log("verify-ai-blueprint-executor: mid-apply rollback ok");
  } finally {
    cleanupWorkspace(workspaceId);
  }
}

console.log("verify-ai-blueprint-executor: all checks passed");
