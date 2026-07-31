/**
 * P1 Customer Experience Sprint — empty-database first-customer journey.
 * signup → login → generate → edit → publish → live
 * No manual intervention. Asserts focused nav, editor loading, status clarity,
 * and publish success CTAs.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.MABPS_BASE_URL || "http://localhost:3000";
const stamp = Date.now();
const EMAIL = `p1.customer.${stamp}@example.com`;
const PASSWORD = "Welcome123!";
const WORKSPACE = `Lotus P1 ${stamp}`;
const OUT = path.join(process.cwd(), "tmp/first-customer-journey-p1");
fs.mkdirSync(OUT, { recursive: true });

const notes = [];
let failed = false;
function note(severity, step, message) {
  notes.push({ severity, step, message, at: new Date().toISOString() });
  console.log(`[${severity}] ${step}: ${message}`);
  if (severity === "critical") failed = true;
}

async function shot(page, name) {
  const file = path.join(OUT, `${String(notes.length).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on("pageerror", (err) =>
    note("high", "console", `pageerror: ${err.message}`.slice(0, 300)),
  );
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      note("medium", "console", `console.error: ${msg.text().slice(0, 300)}`);
    }
  });

  // --- Signup ---
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.getByLabel(/^Name$/i).fill("Priya P1");
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByLabel(/workspace name/i).fill(WORKSPACE);
  await page.getByRole("button", { name: /create account/i }).click();
  try {
    await page.waitForURL(/\/(dashboard|onboarding|website)/, { timeout: 30000 });
  } catch {
    note("critical", "signup", `Signup stuck. URL=${page.url()}`);
    await shot(page, "signup-stuck");
    await finish(browser);
    return;
  }
  note("info", "signup", `Landed on ${page.url()} as ${EMAIL}`);
  await shot(page, "post-signup");

  // Focused nav: primary modules visible, product dump collapsed
  const navText = await page.locator("header").innerText();
  if (!/Dashboard/i.test(navText) || !/Website/i.test(navText)) {
    note("critical", "nav", "Primary Dashboard/Website nav missing after signup");
  } else {
    note("info", "nav", "Primary Dashboard + Website nav visible");
  }
  const dumpHits = [
    "WhatsApp",
    "Guardian",
    "Marketplace",
    "Automation",
    "Knowledge",
    "Memory",
  ].filter((label) => new RegExp(`\\b${label}\\b`).test(navText));
  // These may appear if More is open; they should not all be flat in the header strip.
  const moreBtn = page.getByRole("button", { name: /^More$/i });
  if (dumpHits.length >= 4 && !(await moreBtn.count())) {
    note(
      "high",
      "nav",
      `Product dump still flat in header (no More): ${dumpHits.join(", ")}`,
    );
  } else if (await moreBtn.count()) {
    note("info", "nav", "Secondary modules tucked under More");
  }

  // Active org
  let session = await page.evaluate(async () => {
    const r = await fetch("/api/auth/get-session");
    return r.json();
  });
  if (!session?.session?.activeOrganizationId) {
    note("critical", "session", "activeOrganizationId MISSING after signup");
  } else {
    note(
      "info",
      "session",
      `activeOrganizationId=${session.session.activeOrganizationId}`,
    );
  }

  // --- Logout + login ---
  const signOut = page.getByRole("button", { name: /sign out/i });
  if (await signOut.count()) {
    await signOut.click();
    await page.waitForURL(/\/(login|signup|$)/, { timeout: 15000 }).catch(() => null);
  }
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding|website)/, { timeout: 20000 });
  await shot(page, "post-login");

  session = await page.evaluate(async () => {
    const r = await fetch("/api/auth/get-session");
    return r.json();
  });
  if (!session?.session?.activeOrganizationId) {
    note(
      "critical",
      "session",
      "After login activeOrganizationId=MISSING — manual intervention required",
    );
  } else {
    note("info", "session", "Login kept active organization");
  }

  // Onboarding copy should not claim "one step away" / "under two minutes"
  const dashText = await page.locator("body").innerText();
  if (/under two minutes/i.test(dashText)) {
    note("high", "onboarding", "Still claims 'under two minutes'");
  }
  if (/one step away from publishing/i.test(dashText)) {
    note("high", "onboarding", "Still claims 'one step away from publishing' before a site exists");
  }

  // --- Generate ---
  await page.goto(`${BASE}/website/new/ai`, { waitUntil: "networkidle" });
  await shot(page, "ai-form");
  const example = page.getByRole("button", { name: /Jewellery Store/i });
  if (await example.count()) {
    await example.click();
    note("info", "generate", "Used Jewellery Store example chip");
  } else {
    await page.locator("textarea").first().fill(
      "A luxury jewellery store specializing in handcrafted gold and diamond pieces for modern celebrations.",
    );
  }

  const genBtn = page.getByRole("button", { name: /Generate website/i });
  const t0 = Date.now();
  await genBtn.click();
  note("info", "generate", "Clicked Generate website");
  try {
    await page.waitForURL(/\/website\/(?!new)[^/]+\/(pages|theme)?/, {
      timeout: 180000,
    });
    note(
      "info",
      "generate",
      `Navigated to ${page.url()} in ${Math.round((Date.now() - t0) / 1000)}s`,
    );
  } catch {
    const body = await page.locator("body").innerText();
    note(
      "critical",
      "generate",
      `Generation failed. Excerpt: ${body.replace(/\s+/g, " ").slice(0, 300)}`,
    );
    await shot(page, "generate-failed");
    await finish(browser);
    return;
  }
  await shot(page, "post-generate");

  const siteMatch = page.url().match(/\/website\/([^/]+)/);
  const siteId = siteMatch?.[1];
  if (!siteId) {
    note("critical", "site", "Could not determine siteId");
    await finish(browser);
    return;
  }
  note("info", "site", `siteId=${siteId}`);

  // Site studio essentials visible; advanced tools behind More
  const studioNav = page.locator('nav[aria-label="Website sections"]').first();
  const studioText = (await studioNav.count())
    ? await studioNav.innerText()
    : await page.locator("aside").first().innerText();
  for (const label of ["Pages", "Forms", "Media", "Publish"]) {
    if (!new RegExp(label, "i").test(studioText)) {
      note("high", "nav", `Site studio missing essential: ${label}`);
    }
  }
  if (/Theme Studio/i.test(studioText) && !(await page.getByRole("button", { name: /More tools|More/i }).count())) {
    note("medium", "nav", "Theme Studio still always expanded (acceptable if More is open)");
  }

  // --- Edit ---
  await page.goto(`${BASE}/website/${siteId}/pages`, { waitUntil: "networkidle" });
  await shot(page, "pages-list");

  const pagesBody = await page.locator("body").innerText();
  if (/set status to Published/i.test(pagesBody)) {
    note("high", "status", "Pages list still says 'Published' instead of Live");
  }

  const editBtn = page.getByRole("link", { name: /^(Edit|Opening…)$/i }).first();
  if (await editBtn.count()) {
    await editBtn.click();
  } else {
    const pageLink = page.locator(`a[href*="/website/${siteId}/pages/"]`).first();
    if (await pageLink.count()) await pageLink.click();
    else note("critical", "edit", "No Edit / page link found");
  }

  // Loading affordance while dynamic chunks load
  const sawOpening = await page
    .getByText(/Opening editor|Opening…|Loading page builder/i)
    .first()
    .waitFor({ state: "visible", timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (sawOpening) {
    note("info", "edit", "Saw editor opening / loading state");
  } else {
    note("medium", "edit", "Did not observe loading state (may have loaded instantly)");
  }

  try {
    await page.getByRole("button", { name: /Save page/i }).waitFor({
      state: "visible",
      timeout: 30000,
    });
    note("info", "edit", "Editor mounted — Save page visible");
  } catch {
    note("critical", "edit", "Save page never appeared — editor may look broken");
    await shot(page, "editor-stuck");
  }
  await shot(page, "editor");

  // Status model uses Live (not contradictory Published)
  const statusSelect = page.getByLabel(/Page status/i).first();
  if (await statusSelect.count()) {
    const options = await statusSelect.locator("option").allTextContents();
    if (options.some((o) => /^Published$/i.test(o.trim()))) {
      note("high", "status", "Editor status select still uses 'Published' label");
    }
    if (!options.some((o) => /^Live$/i.test(o.trim()))) {
      note("high", "status", "Editor status select missing 'Live' label");
    } else {
      note("info", "status", "Editor status select uses Live/Draft");
    }
  }

  // First-edit: Content open; advanced background collapsed
  const advancedBg = page.getByText(/Advanced background/i);
  if (await advancedBg.count()) {
    note("info", "edit", "Advanced background is progressively disclosed");
  }

  // Select first section so inspector fields mount
  const sectionOption = page.locator('[role="listbox"] [role="option"], [role="listbox"] button, [role="listbox"] li').first();
  if (await sectionOption.count()) {
    await sectionOption.click();
    await page.waitForTimeout(400);
  } else {
    const heroChip = page.getByText(/Hero banner/i).first();
    if (await heroChip.count()) await heroChip.click();
  }

  // Make a simple edit — prefer labeled Headline, fall back to first inspector input
  let edited = false;
  const headline = page.getByLabel(/^Headline$/i).first();
  if (await headline.count()) {
    await headline.fill("Handcrafted Jewellery for Every Moment");
    edited = true;
    note("info", "edit", "Edited Headline field");
  } else {
    const contentCard = page.getByRole("button", { name: /Content/i }).first();
    if (await contentCard.count()) {
      const expanded = await contentCard.getAttribute("aria-expanded");
      if (expanded === "false") await contentCard.click();
    }
    const headlineAgain = page.getByLabel(/^Headline$/i).first();
    if (await headlineAgain.count()) {
      await headlineAgain.fill("Handcrafted Jewellery for Every Moment");
      edited = true;
      note("info", "edit", "Edited Headline after opening Content card");
    } else {
      const inspectorInput = page
        .locator("aside ~ div input, .space-y-4 input[type='text'], input")
        .filter({ hasNot: page.locator("[disabled]") })
        .first();
      // Prefer inputs near "Headline" text
      const nearHeadline = page.locator("label:has-text('Headline') + * input, label:has-text('Headline') ~ input, div:has(> label:has-text('Headline')) input").first();
      if (await nearHeadline.count()) {
        await nearHeadline.fill("Handcrafted Jewellery for Every Moment");
        edited = true;
        note("info", "edit", "Edited Headline via adjacent input");
      } else if (await page.locator("textarea").count()) {
        await page.locator("textarea").first().fill("Handcrafted Jewellery for Every Moment");
        edited = true;
        note("info", "edit", "Edited first textarea as fallback");
      } else if (await inspectorInput.count()) {
        await inspectorInput.fill("Handcrafted Jewellery for Every Moment");
        edited = true;
        note("medium", "edit", "Edited first available input as fallback");
      }
    }
  }
  if (!edited) note("high", "edit", "Could not find Headline field");

  const saveBtn = page.getByRole("button", { name: /Save page/i }).first();
  if (await saveBtn.count()) {
    const disabled = await saveBtn.isDisabled();
    if (disabled && !edited) {
      note("medium", "edit", "Save page disabled (no dirty changes) — skipping click");
    } else if (disabled) {
      // Wait briefly for dirty state to enable Save
      await page.waitForTimeout(800);
      if (await saveBtn.isDisabled()) {
        note("high", "edit", "Save page stayed disabled after edit");
      } else {
        await saveBtn.click();
        await page.waitForTimeout(1500);
        note("info", "edit", "Clicked Save page");
      }
    } else {
      await saveBtn.click();
      await page.waitForTimeout(1500);
      note("info", "edit", "Clicked Save page");
    }
  }
  await shot(page, "after-edit");

  // --- Publish ---
  await page.goto(`${BASE}/website/${siteId}/publish`, { waitUntil: "networkidle" });
  await shot(page, "publish");
  const pubBtn = page.getByRole("button", { name: /Publish website|Publish|Go live/i }).first();
  if (!(await pubBtn.count())) {
    note("critical", "publish", "No publish button");
  } else {
    await pubBtn.click({ force: true });
    await page.waitForTimeout(4000);
    await shot(page, "after-publish");
    note("info", "publish", "Clicked publish");
  }

  const afterPub = await page.locator("body").innerText();
  if (!/Your website is now live/i.test(afterPub)) {
    note("high", "publish", "Missing success headline 'Your website is now live'");
  }
  const openLive = page.getByRole("link", { name: /Open Live Site/i });
  const copyUrl = page.getByRole("button", { name: /Copy URL|Copied!/i });
  if (!(await openLive.count())) {
    note("critical", "publish", "Open Live Site primary action missing");
  } else {
    note("info", "publish", "Open Live Site CTA present");
  }
  if (!(await copyUrl.count())) {
    note("high", "publish", "Copy URL action missing");
  }
  if (/localhost/i.test(afterPub) && !/not publicly shareable|local (development )?preview/i.test(afterPub)) {
    note("high", "publish", "Localhost URL shown without non-shareable disclaimer");
  } else if (/local (development )?preview|not publicly shareable/i.test(afterPub)) {
    note("info", "publish", "Local preview disclaimer shown");
  }

  // Contradictory Draft/Live/Published on success screen
  if (/is published and ready/i.test(afterPub)) {
    note("medium", "status", "Success copy still says 'published' instead of live");
  }

  const site = await page.evaluate(async (id) => {
    const r = await fetch(`/api/website/sites/${id}`);
    return r.json().catch(() => ({}));
  }, siteId);
  const slug = site?.site?.slug || site?.slug;
  note("info", "site", `API name=${site?.site?.name || site?.name} slug=${slug}`);

  if (!slug) {
    note("critical", "live", "Could not determine live slug");
  } else {
    const live = `${BASE}/p/${slug}`;
    const resp = await page.goto(live, { waitUntil: "networkidle" });
    await shot(page, "live");
    const liveBody = await page.locator("body").innerText();
    if ((resp?.status() ?? 500) >= 400 || /404|not found|unpublished/i.test(liveBody)) {
      note("critical", "live", `Live URL failed status=${resp?.status()} url=${live}`);
    } else {
      note("info", "live", `Live OK status=${resp?.status()} url=${live}`);
    }
    // Copyright year should be current
    const year = new Date().getFullYear();
    if (new RegExp(`©\\s*${year - 1}`).test(liveBody) && !new RegExp(`©\\s*${year}`).test(liveBody)) {
      note("high", "copyright", `Stale copyright year ${year - 1} on live site`);
    }
  }

  await finish(browser);
}

async function finish(browser) {
  fs.writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify({ notes, failed, email: EMAIL, workspace: WORKSPACE }, null, 2),
  );
  console.log("Wrote", path.join(OUT, "report.json"));
  console.log(failed ? "FAILED" : "PASSED");
  await browser.close();
  if (failed) process.exit(1);
}

main().catch(async (e) => {
  note("critical", "runner", e.stack || String(e));
  fs.writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify({ notes, failed: true, email: EMAIL, workspace: WORKSPACE }, null, 2),
  );
  process.exit(1);
});
