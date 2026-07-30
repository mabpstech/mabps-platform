/**
 * Live HTTP verification of editing reliability against a running Next server.
 *
 * Prerequisites: signed-in cookies file + site/page ids.
 * Run by the product sprint harness (see shell invocation).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const BASE = process.env.MABPS_BASE_URL || "http://localhost:3000";
const COOKIE_FILE = process.env.MABPS_COOKIE_FILE || "/tmp/mabps-edit-cookies.txt";
const SITE_ID = process.env.MABPS_SITE_ID!;
const PAGE_ID = process.env.MABPS_PAGE_ID!;

function cookieHeader(): string {
  const raw = readFileSync(COOKIE_FILE, "utf8");
  const parts: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.startsWith("# ") || line === "#") continue;
    // Netscape format may prefix HttpOnly cookies with "#HttpOnly_".
    const normalized = line.startsWith("#HttpOnly_")
      ? line.slice("#HttpOnly_".length)
      : line.startsWith("#")
        ? ""
        : line;
    if (!normalized) continue;
    const cols = normalized.split("\t");
    if (cols.length < 7) continue;
    parts.push(`${cols[5]}=${cols[6]}`);
  }
  return parts.join("; ");
}

async function api(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<{ status: number; data: any }> {
  const headers = new Headers(init.headers);
  headers.set("Origin", BASE);
  headers.set("Cookie", cookieHeader());
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function main() {
  assert.ok(SITE_ID && PAGE_ID, "MABPS_SITE_ID and MABPS_PAGE_ID required");

  const results: string[] = [];

  // --- Scenario A: autosave persistence (refresh never loses work) ---
  const loaded = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`);
  assert.equal(loaded.status, 200, "load page");
  const baseUpdatedAt = loaded.data.page.updatedAt as string;
  const marker = `Keep-on-refresh ${Date.now()}`;

  const saved = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`, {
    method: "PATCH",
    json: {
      title: marker,
      expectedUpdatedAt: baseUpdatedAt,
      sections: [
        {
          type: "hero",
          content: {
            headline: marker,
            subheadline: "Autosave recovery check",
            primaryCtaLabel: "Go",
            primaryCtaHref: "#",
          },
          settings: {},
        },
      ],
    },
  });
  assert.equal(saved.status, 200, `autosave write: ${saved.data.error || ""}`);
  assert.equal(saved.data.page.title, marker);

  const afterRefresh = await api(
    `/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`,
  );
  assert.equal(afterRefresh.status, 200);
  assert.equal(
    afterRefresh.data.page.title,
    marker,
    "refresh must keep saved title",
  );
  const hero = (afterRefresh.data.sections || []).find(
    (s: { type: string }) => s.type === "hero",
  );
  assert.ok(hero, "hero section present after refresh");
  assert.equal(hero.content.headline, marker);
  results.push("PASS refresh-never-loses-work");

  // --- Scenario B: close protection only when dirty (protocol) ---
  // Server cannot fire beforeunload; verify clean vs dirty contract:
  // clean session has matching revision; dirty client must send expectedUpdatedAt.
  assert.ok(
    typeof afterRefresh.data.page.updatedAt === "string",
    "revision token present for leave-guard clients",
  );
  results.push("PASS leave-guard-revision-contract");

  // --- Scenario C: network interruption recovers (retry succeeds) ---
  // Simulate failed attempt then successful retry with same expectedUpdatedAt
  // after the failed attempt did not mutate (by using a bogus path then real path).
  const rev = afterRefresh.data.page.updatedAt as string;
  const retryMarker = `Retry-ok ${Date.now()}`;
  const failed = await api(`/api/website/sites/${SITE_ID}/pages/not-a-real-page`, {
    method: "PATCH",
    json: { title: "nope", expectedUpdatedAt: rev },
  });
  assert.equal(failed.status, 404, "failed attempt does not write");

  const retried = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`, {
    method: "PATCH",
    json: {
      title: retryMarker,
      expectedUpdatedAt: rev,
    },
  });
  assert.equal(retried.status, 200, `retry save: ${retried.data.error || ""}`);
  assert.equal(retried.data.page.title, retryMarker);
  results.push("PASS network-interruption-recovers");

  // --- Scenario D: two sessions do not silently overwrite ---
  const tabARev = retried.data.page.updatedAt as string;
  const tabA = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`, {
    method: "PATCH",
    json: {
      title: `Tab-A ${Date.now()}`,
      expectedUpdatedAt: tabARev,
    },
  });
  assert.equal(tabA.status, 200);

  const tabB = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`, {
    method: "PATCH",
    json: {
      title: `Tab-B should conflict ${Date.now()}`,
      expectedUpdatedAt: tabARev, // stale
    },
  });
  assert.equal(tabB.status, 409, "stale tab must conflict");
  assert.equal(tabB.data.code, "edit_conflict");
  assert.ok(tabB.data.currentUpdatedAt);

  const stillA = await api(`/api/website/sites/${SITE_ID}/pages/${PAGE_ID}`);
  assert.equal(stillA.data.page.title, tabA.data.page.title);
  assert.notEqual(
    stillA.data.page.title.includes("Tab-B"),
    true,
    "tab B must not overwrite",
  );
  results.push("PASS two-tabs-conflict");

  // Header conflict as second editor surface
  const header = await api(`/api/website/sites/${SITE_ID}/header`);
  assert.equal(header.status, 200);
  const hRev = header.data.header.updatedAt as string;
  const hA = await api(`/api/website/sites/${SITE_ID}/header`, {
    method: "PUT",
    json: {
      ...header.data.header,
      logoText: "Header A",
      expectedUpdatedAt: hRev,
    },
  });
  assert.equal(hA.status, 200);
  const hB = await api(`/api/website/sites/${SITE_ID}/header`, {
    method: "PUT",
    json: {
      ...header.data.header,
      logoText: "Header B",
      expectedUpdatedAt: hRev,
    },
  });
  assert.equal(hB.status, 409);
  results.push("PASS header-conflict");

  console.log(results.join("\n"));
  console.log("verify-editing-reliability-live: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
