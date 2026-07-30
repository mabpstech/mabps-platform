/**
 * Product Sprint — editing reliability verification.
 * Covers optimistic concurrency + retry-safe revision tokens.
 *
 * Run: npx tsx scripts/verify-editing-reliability.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sqlite } from "../lib/db";
import { EditConflictError } from "../lib/website/edit-conflict";
import {
  createPage,
  createSite,
  deleteSite,
  getPageById,
  listPages,
  listSections,
  replaceSections,
  updateHeader,
  updatePage,
  getHeaderBySiteId,
} from "../lib/website/repository";

const workspaceId = `verify-edit-ws-${randomUUID()}`;
const workspaceSlug = `verify-edit-${Date.now().toString(36)}`;

sqlite
  .prepare(
    `INSERT INTO "organization" ("id", "name", "slug", "logo", "createdAt", "metadata")
     VALUES (?, ?, ?, NULL, ?, NULL)`,
  )
  .run(
    workspaceId,
    "Editing Reliability Verify WS",
    workspaceSlug,
    new Date().toISOString(),
  );

const site = createSite({
  workspaceId,
  name: "Editing Reliability Verify",
  slug: `edit-reliability-${Date.now().toString(36)}`,
  template: "classic",
  category: "retail",
});

try {
  const home = listPages(site.id).find((page) => page.pageType === "home");
  assert.ok(home, "home page should exist");

  const page = createPage({
    siteId: site.id,
    title: "Reliability Page",
    slug: "reliability-page",
  });

  const base = getPageById(page.id)!;
  const first = updatePage(page.id, {
    title: "Saved by tab A",
    expectedUpdatedAt: base.updatedAt,
  });
  assert.equal(first.title, "Saved by tab A");

  // Tab B still holding the old revision must conflict.
  assert.throws(
    () =>
      updatePage(page.id, {
        title: "Saved by tab B",
        expectedUpdatedAt: base.updatedAt,
      }),
    (error: unknown) => error instanceof EditConflictError,
  );

  // Winner can continue with the new revision.
  const second = updatePage(page.id, {
    title: "Saved by tab A again",
    expectedUpdatedAt: first.updatedAt,
  });
  assert.equal(second.title, "Saved by tab A again");
  assert.notEqual(second.updatedAt, first.updatedAt);

  // Sections replace + page bump stay consistent for page editor saves.
  replaceSections(page.id, [
    {
      type: "hero",
      content: {
        headline: "Keep my draft",
        subheadline: "Autosave recovery",
        primaryCtaLabel: "Go",
        primaryCtaHref: "#",
      },
      settings: {},
    },
  ]);
  const afterSections = updatePage(page.id, {
    title: second.title,
    expectedUpdatedAt: second.updatedAt,
  });
  assert.ok(listSections(page.id).some((section) => section.type === "hero"));
  assert.equal(afterSections.title, "Saved by tab A again");

  // Header concurrency
  const header = getHeaderBySiteId(site.id)!;
  const headerSaved = updateHeader(site.id, {
    logoText: "Tab A brand",
    expectedUpdatedAt: header.updatedAt,
  });
  assert.throws(
    () =>
      updateHeader(site.id, {
        logoText: "Tab B brand",
        expectedUpdatedAt: header.updatedAt,
      }),
    (error: unknown) => error instanceof EditConflictError,
  );
  assert.equal(
    updateHeader(site.id, {
      logoText: "Tab A brand final",
      expectedUpdatedAt: headerSaved.updatedAt,
    }).logoText,
    "Tab A brand final",
  );

  console.log("verify-editing-reliability: ok");
} finally {
  deleteSite(site.id);
  sqlite.prepare(`DELETE FROM "organization" WHERE "id" = ?`).run(workspaceId);
}
