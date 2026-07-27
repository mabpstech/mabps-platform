/**
 * Regression: section edits must persist (Release Blocker #1).
 * Run: npx tsx scripts/verify-sections-save.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { publishSite } from "../lib/website/publish";
import {
  createSite,
  deleteSite,
  getPageById,
  getSiteBySlug,
  listPages,
  listSections,
  replaceSections,
  updatePage,
} from "../lib/website/repository";
import { parseSectionsPayload } from "../lib/website/section-payload";
import { loadPublicSite, resolvePublicPage } from "../lib/website/public";

const workspaceId = `verify-ws-${randomUUID()}`;
const headline = `RC1 Hero ${Date.now()}`;

const site = createSite({
  workspaceId,
  name: "Sections Save Verify",
  slug: `sections-save-${Date.now().toString(36)}`,
  template: "classic",
  category: "retail",
});

try {
  const pages = listPages(site.id);
  const home = pages.find((page) => page.pageType === "home");
  assert.ok(home, "home page should exist");

  const existing = listSections(home.id);
  assert.ok(existing.length > 0, "home should have seeded sections");

  const payload = parseSectionsPayload(
    existing.map((section) => ({
      id: section.id,
      type: section.type,
      content:
        section.type === "hero"
          ? { ...section.content, headline }
          : section.content,
      settings: section.settings,
    })),
  );

  const saved = replaceSections(home.id, payload);
  const hero = saved.find((section) => section.type === "hero");
  assert.ok(hero, "hero section should remain");
  assert.equal(
    String((hero.content as { headline?: string }).headline ?? ""),
    headline,
    "replaceSections must persist hero headline",
  );

  // Round-trip via getPageById (same lookup the page PATCH uses before save)
  const pageAfter = getPageById(home.id);
  assert.ok(pageAfter && pageAfter.siteId === site.id);

  updatePage(home.id, {
    status: "published",
    publishedAt: new Date().toISOString(),
  });
  publishSite(site.id, { name: "verify-script" });

  const published = getSiteBySlug(site.slug);
  assert.ok(published, "site should exist by slug");
  const publicSite = loadPublicSite(published);
  assert.ok(publicSite, "published site should load publicly");
  const publicPage = resolvePublicPage(published.id, []);
  assert.ok(publicPage, "public home should resolve");
  const publicHero = publicPage.sections.find(
    (section) => section.type === "hero",
  );
  assert.ok(publicHero, "public home should include hero");
  assert.equal(
    String((publicHero.content as { headline?: string }).headline ?? ""),
    headline,
    "publish must reflect edited section content",
  );

  // Editor must save via registered page PATCH, not nested /sections PUT.
  const builderSource = readFileSync(
    join(process.cwd(), "components/website/page-builder.tsx"),
    "utf8",
  );
  assert.match(
    builderSource,
    /method:\s*"PATCH"/,
    "page builder should PATCH the page route",
  );
  assert.doesNotMatch(
    builderSource,
    /\/sections[\s\S]{0,120}method:\s*"PUT"|method:\s*"PUT"[\s\S]{0,120}\/sections/,
    "page builder must not PUT nested /sections (framework 404 regression)",
  );
  assert.match(
    builderSource,
    /sections:\s*snapshotSections\.map/,
    "page builder should include sections in the page PATCH body",
  );

  // parseSectionsPayload rejects bad input
  assert.throws(() => parseSectionsPayload(null), /sections array is required/);
  assert.throws(
    () => parseSectionsPayload([{ type: "not-a-section" }]),
    /Invalid section type/,
  );

  console.log("verify-sections-save: ok");
  console.log(`  site=${site.slug} headline=${headline}`);
} finally {
  deleteSite(site.id);
}
