/**
 * Continue first-customer journey with active workspace enforced.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const EMAIL = "priya.firstcustomer@example.com";
const PASSWORD = "Welcome123!";
const OUT = path.join(process.cwd(), "tmp/first-customer-journey-2");
fs.mkdirSync(OUT, { recursive: true });
const notes = [];
function note(severity, step, message) {
  notes.push({ severity, step, message, at: new Date().toISOString() });
  console.log(`[${severity}] ${step}: ${message}`);
}
async function shot(page, name) {
  const file = path.join(OUT, `${String(notes.length).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("console", (msg) => {
    if (msg.type() === "error") note("medium", "console", msg.text().slice(0, 240));
  });

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding|website)/, { timeout: 20000 });
  await shot(page, "dashboard");

  // Check session active org
  const session = await page.evaluate(async () => {
    const r = await fetch("/api/auth/get-session");
    return r.json();
  });
  const activeOrg = session?.session?.activeOrganizationId;
  note(
    activeOrg ? "info" : "critical",
    "session",
    `After login activeOrganizationId=${activeOrg || "MISSING"} user=${session?.user?.email}`,
  );

  if (!activeOrg) {
    // List orgs and set active — customer shouldn't need this
    const orgs = await page.evaluate(async () => {
      const r = await fetch("/api/auth/organization/list");
      return r.json();
    });
    note("critical", "session", `Org list after login: ${JSON.stringify(orgs).slice(0, 400)}`);
    const orgId = Array.isArray(orgs)
      ? orgs[0]?.id
      : orgs?.organizations?.[0]?.id || orgs?.[0]?.id;
    if (orgId) {
      note("high", "session", "Manually setting active organization because login left none active");
      await page.evaluate(async (id) => {
        await fetch("/api/auth/organization/set-active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: id }),
        });
      }, orgId);
    }
  }

  // Onboarding CTA
  const createWebsite = page.getByRole("link", { name: /^Create Website$/i }).or(
    page.getByRole("button", { name: /^Create Website$/i }),
  );
  if (await createWebsite.count()) {
    await createWebsite.first().click();
    await page.waitForLoadState("networkidle");
  } else {
    await page.goto(`${BASE}/website/new`, { waitUntil: "networkidle" });
    note("medium", "onboarding", "Create Website CTA not clickable as link/button");
  }
  await shot(page, "create-path");
  note("info", "create", `URL=${page.url()}`);

  // Choose AI
  const ai = page.getByRole("button", { name: /Generate with AI/i });
  if (await ai.count()) await ai.click();
  else await page.goto(`${BASE}/website/new/ai`, { waitUntil: "networkidle" });
  await page.waitForLoadState("networkidle");
  await shot(page, "ai-form");

  // Click jewellery example
  const example = page.getByRole("button", { name: /Jewellery Store/i });
  if (await example.count()) {
    await example.click();
    note("info", "generate", "Used Jewellery Store example chip");
  } else {
    await page.locator("textarea").first().fill(
      "A luxury jewellery store specializing in handcrafted gold and diamond pieces for modern celebrations in Mumbai.",
    );
  }
  await shot(page, "ai-filled");

  // Generate
  const genBtn = page.getByRole("button", { name: /Generate website/i });
  const t0 = Date.now();
  await genBtn.click();
  note("info", "generate", "Clicked Generate website");

  // Wait progress or error or navigation
  try {
    await page.waitForURL(/\/website\/(?!new)[^/]+\/(pages|theme)?/, { timeout: 180000 });
    note("info", "generate", `Navigated to ${page.url()} in ${Math.round((Date.now() - t0) / 1000)}s`);
  } catch {
    const body = await page.locator("body").innerText();
    if (/No active workspace/i.test(body)) {
      note("critical", "generate", "Generation failed: No active workspace (UI shows workspace name in header)");
    }
    if (/Generation paused|Couldn't finish/i.test(body)) {
      const err = body.match(/Couldn't finish generation[\s\S]{0,120}/)?.[0];
      note("critical", "generate", err || "Generation paused with error");
    }
    await shot(page, "generate-failed");
    // try API generate from page context as last resort to continue journey observation
    const api = await page.evaluate(async () => {
      const r = await fetch("/api/website/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "A luxury jewellery store specializing in handcrafted gold and diamond pieces for modern celebrations in Mumbai.",
        }),
      });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    });
    note(api.status === 200 ? "high" : "critical", "generate", `Direct API generate status=${api.status} body=${JSON.stringify(api.body).slice(0, 300)}`);
    if (api.body?.siteId) {
      await page.goto(`${BASE}${api.body.builderHref || `/website/${api.body.siteId}/pages`}`, {
        waitUntil: "networkidle",
      });
    } else {
      fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes }, null, 2));
      await browser.close();
      return;
    }
  }
  await shot(page, "post-generate");

  const siteMatch = page.url().match(/\/website\/([^/]+)/);
  const siteId = siteMatch?.[1];
  note("info", "site", `siteId=${siteId} url=${page.url()}`);

  // Observe generated site name
  const pagesText = await page.locator("body").innerText();
  note("info", "site", `Pages screen excerpt: ${pagesText.replace(/\s+/g, " ").slice(0, 350)}`);
  if (/New website/i.test(pagesText)) {
    note("high", "generate", "Generated site is titled 'New website' — business name not applied");
  }

  // Open first page editor
  const pageLink = page.locator(`a[href*="/website/${siteId}/pages/"]`).first();
  if (await pageLink.count()) {
    const href = await pageLink.getAttribute("href");
    note("info", "edit", `Opening page ${href}`);
    await pageLink.click();
    await page.waitForLoadState("networkidle");
  } else {
    note("critical", "edit", "No page to edit after generation");
  }
  await page.waitForTimeout(3000);
  await shot(page, "editor");

  // Edit something
  const headline = page.getByLabel(/Headline|Hero headline|Title/i).first();
  if (await headline.count()) {
    await headline.fill("Jewellery crafted for life's celebrations");
    note("info", "edit", "Changed headline");
  } else {
    const ta = page.locator("textarea").first();
    if (await ta.count()) {
      await ta.fill("Jewellery crafted for life's celebrations");
      note("medium", "edit", "Edited first textarea (no labeled headline found)");
    } else {
      note("high", "edit", "Could not find editable field");
    }
  }
  const save = page.getByRole("button", { name: /^Save|Save changes|Save page$/i }).first();
  if (await save.count()) {
    await save.click();
    await page.waitForTimeout(2500);
    note("info", "edit", "Clicked save");
  } else {
    note("high", "edit", "No save button");
  }
  await shot(page, "after-save");

  // Publish
  await page.goto(`${BASE}/website/${siteId}/publish`, { waitUntil: "networkidle" });
  await shot(page, "publish");
  const pubText = await page.locator("body").innerText();
  note("info", "publish", `Publish excerpt: ${pubText.replace(/\s+/g, " ").slice(0, 450)}`);

  const pubBtn = page.getByRole("button", { name: /Publish|Go live|Make live/i }).first();
  if (await pubBtn.count()) {
    const disabled = await pubBtn.isDisabled();
    if (disabled) note("high", "publish", "Publish button is disabled");
    await pubBtn.click({ force: true });
    await page.waitForTimeout(4000);
    await shot(page, "after-publish");
    const after = await page.locator("body").innerText();
    note("info", "publish", `After publish: ${after.replace(/\s+/g, " ").slice(0, 450)}`);
    if (/error|failed|denied|upgrade|plan/i.test(after) && /publish/i.test(after)) {
      note("critical", "publish", "Publish appears blocked or errored");
    }
  } else {
    note("critical", "publish", "No publish button");
  }

  // Discover live URL
  const hrefs = await page.locator("a[href]").evaluateAll((as) =>
    as.map((a) => a.href).filter((h) => /\/p\/|\/site/.test(h)),
  );
  note("info", "live", `Live-ish hrefs: ${hrefs.slice(0, 8).join(" | ")}`);
  let live = hrefs[0];
  if (!live) {
    // get slug from page text or API
    const site = await page.evaluate(async (id) => {
      const r = await fetch(`/api/website/sites/${id}`);
      return r.json().catch(() => ({}));
    }, siteId);
    const slug = site?.site?.slug || site?.slug;
    note("info", "live", `Site API slug=${slug} raw=${JSON.stringify(site).slice(0, 250)}`);
    if (slug) live = `${BASE}/p/${slug}`;
  }
  if (!live) {
    note("critical", "live", "Could not determine live URL");
  } else {
    const resp = await page.goto(live, { waitUntil: "networkidle" });
    await shot(page, "live");
    note(resp?.status() >= 400 ? "critical" : "info", "live", `status=${resp?.status()} url=${page.url()}`);
    const liveBody = await page.locator("body").innerText();
    note("info", "live", `Live excerpt: ${liveBody.replace(/\s+/g, " ").slice(0, 350)}`);
    if (/404|not found|unpublished/i.test(liveBody)) note("critical", "live", "Live URL not serving site");
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes }, null, 2));
  console.log("Wrote", path.join(OUT, "report.json"));
  await browser.close();
}

main().catch((e) => {
  note("critical", "runner", e.stack || String(e));
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes }, null, 2));
  process.exit(1);
});
