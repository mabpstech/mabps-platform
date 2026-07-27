/**
 * Regression: website create must seed a valid header, and partial header
 * updates must not wipe ctaStyle (Release Blocker #2).
 * Run: npx tsx scripts/verify-website-create-header.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sqlite } from "../lib/db";
import {
  createSite,
  deleteSite,
  getHeaderBySiteId,
  updateHeader,
} from "../lib/website/repository";
import { isButtonStyle } from "../lib/website/types";

const workspaceId = `verify-ws-${randomUUID()}`;
const workspaceSlug = `verify-header-${Date.now().toString(36)}`;

sqlite
  .prepare(
    `INSERT INTO "organization" ("id", "name", "slug", "logo", "createdAt", "metadata")
     VALUES (?, ?, ?, NULL, ?, NULL)`,
  )
  .run(workspaceId, "Header Create Verify WS", workspaceSlug, new Date().toISOString());

const site = createSite({
  workspaceId,
  name: "Header Create Verify",
  slug: `header-create-${Date.now().toString(36)}`,
  template: "classic",
  category: "retail",
});

try {
  const seeded = getHeaderBySiteId(site.id);
  assert.ok(seeded, "createSite must insert a header row");
  assert.ok(
    isButtonStyle(seeded.ctaStyle),
    `seeded header ctaStyle must be valid, got ${String(seeded.ctaStyle)}`,
  );
  assert.equal(seeded.ctaStyle, "primary");
  assert.equal(seeded.logoText, site.name);

  // Reproduce create-wizard partial PUT (historically omitted ctaStyle and
  // passed undefined through the API → NOT NULL constraint failure).
  const updated = updateHeader(site.id, {
    logoText: site.name,
    ctaLabel: "Shop now",
    ctaHref: "/products",
    ctaStyle: undefined,
  });
  assert.ok(
    isButtonStyle(updated.ctaStyle),
    `partial update must keep valid ctaStyle, got ${String(updated.ctaStyle)}`,
  );
  assert.equal(updated.ctaStyle, "primary");
  assert.equal(updated.ctaLabel, "Shop now");
  assert.equal(updated.ctaHref, "/products");

  const reloaded = getHeaderBySiteId(site.id);
  assert.ok(reloaded);
  assert.equal(reloaded.ctaStyle, "primary");

  const wizardSource = readFileSync(
    join(process.cwd(), "components/website/create-site-wizard.tsx"),
    "utf8",
  );
  assert.match(
    wizardSource,
    /ctaStyle:\s*"primary"/,
    "create wizard header PUT must include ctaStyle",
  );
  assert.match(
    wizardSource,
    /headerResponse\.ok/,
    "create wizard must surface header PUT failures",
  );

  console.log("verify-website-create-header: ok");
  console.log(`  site=${site.slug} ctaStyle=${reloaded.ctaStyle}`);
} finally {
  deleteSite(site.id);
  sqlite.prepare(`DELETE FROM "organization" WHERE "id" = ?`).run(workspaceId);
}
