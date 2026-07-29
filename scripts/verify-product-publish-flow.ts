/**
 * Product Sprint — create → edit → publish → live verification.
 * Also checks: new pages default to published when the site is live.
 *
 * Run: npx tsx scripts/verify-product-publish-flow.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sqlite } from "../lib/db";
import { publishSite } from "../lib/website/publish";
import {
  createPage,
  createSite,
  deleteSite,
  getPageBySlug,
  getSiteById,
  listPages,
  replaceSections,
  updatePage,
} from "../lib/website/repository";
import { loadPublicSite, resolvePublicPage } from "../lib/website/public";

const workspaceId = `verify-ws-${randomUUID()}`;
const workspaceSlug = `verify-publish-${Date.now().toString(36)}`;
const headline = `Product Sprint ${Date.now()}`;

sqlite
  .prepare(
    `INSERT INTO "organization" ("id", "name", "slug", "logo", "createdAt", "metadata")
     VALUES (?, ?, ?, NULL, ?, NULL)`,
  )
  .run(
    workspaceId,
    "Product Publish Verify WS",
    workspaceSlug,
    new Date().toISOString(),
  );

const site = createSite({
  workspaceId,
  name: "Product Publish Verify",
  slug: `product-publish-${Date.now().toString(36)}`,
  template: "classic",
  category: "retail",
});

try {
  const pages = listPages(site.id);
  const home = pages.find((page) => page.pageType === "home");
  assert.ok(home, "home page should exist");

  // Before site publish, manual pages stay draft.
  const preLivePage = createPage({
    siteId: site.id,
    title: "Pre-live Services",
    slug: "pre-live-services",
  });
  assert.equal(
    preLivePage.status,
    "draft",
    "new pages on draft sites should start as draft",
  );

  // Edit home content, then publish the site.
  const homeSections = replaceSections(home.id, [
    {
      type: "hero",
      content: {
        headline,
        subheadline: "Verified end-to-end",
        primaryCtaLabel: "Get started",
        primaryCtaHref: "#",
      },
      settings: {},
    },
  ]);
  assert.ok(homeSections.some((section) => section.type === "hero"));

  updatePage(home.id, {
    status: "published",
    publishedAt: new Date().toISOString(),
  });
  const published = publishSite(site.id, { name: "product-sprint" });
  assert.equal(published.site.status, "published");
  assert.equal(getSiteById(site.id)?.status, "published");

  const publicSite = loadPublicSite(published.site);
  assert.ok(publicSite, "published site should load publicly");
  const publicHome = resolvePublicPage(published.site.id, []);
  assert.ok(publicHome, "public home should resolve");
  const publicHero = publicHome.sections.find(
    (section) => section.type === "hero",
  );
  assert.ok(publicHero, "public home should include hero");
  assert.equal(
    String((publicHero.content as { headline?: string }).headline ?? ""),
    headline,
    "live home must reflect saved edits",
  );

  // After site is live, new pages default to published and are publicly reachable.
  const livePage = createPage({
    siteId: site.id,
    title: "Services",
    slug: "services",
  });
  assert.equal(
    livePage.status,
    "published",
    "new pages on live sites should default to published",
  );
  assert.ok(livePage.publishedAt, "published pages need publishedAt");

  const bySlug = getPageBySlug(site.id, "services");
  assert.ok(bySlug && bySlug.status === "published");

  const publicServices = resolvePublicPage(published.site.id, ["services"]);
  assert.ok(
    publicServices,
    "services page created after go-live must be publicly reachable",
  );

  // Draft pages stay private even when the site is live.
  const stillDraft = resolvePublicPage(published.site.id, ["pre-live-services"]);
  assert.equal(
    stillDraft,
    null,
    "draft pages must stay private on a live site",
  );

  console.log("verify-product-publish-flow: ok");
  console.log(`  site=/p/${site.slug}`);
  console.log(`  livePage=/p/${site.slug}/services status=${livePage.status}`);
} finally {
  deleteSite(site.id);
  sqlite.prepare(`DELETE FROM "organization" WHERE "id" = ?`).run(workspaceId);
}
