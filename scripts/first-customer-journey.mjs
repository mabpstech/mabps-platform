/**
 * First-time customer journey probe (observe only — no product fixes).
 * Login → create website → generate → edit → publish → visit live URL.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.MABPS_BASE_URL || "http://localhost:3000";
const EMAIL = "priya.firstcustomer@example.com";
const PASSWORD = "Welcome123!";
const OUT = path.join(process.cwd(), "tmp/first-customer-journey");
fs.mkdirSync(OUT, { recursive: true });

const notes = [];
function note(severity, step, message, extra = {}) {
  const entry = { severity, step, message, at: new Date().toISOString(), ...extra };
  notes.push(entry);
  console.log(`[${severity}] ${step}: ${message}`);
}

async function shot(page, name) {
  const file = path.join(OUT, `${String(notes.length).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("pageerror", (err) => note("high", "console", `pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") note("medium", "console", `console.error: ${msg.text().slice(0, 300)}`);
  });

  // --- Login ---
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await shot(page, "login");
  if (await page.getByText(/continue with Google/i).count()) {
    const hasGoogleBtn = await page.getByRole("button", { name: /google/i }).count();
    if (!hasGoogleBtn) {
      note("high", "login", "Copy mentions Google continue but no Google button is shown");
    }
  }
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  try {
    await page.waitForURL(/\/(dashboard|onboarding|website)/, { timeout: 20000 });
  } catch {
    note("critical", "login", `Login did not navigate away from login. URL=${page.url()}`);
    await shot(page, "login-stuck");
    const err = await page.locator("[class*='error'], [role='alert']").allTextContents();
    if (err.length) note("critical", "login", `Error shown: ${err.join(" | ")}`);
  }
  await shot(page, "post-login");
  note("info", "login", `Landed on ${page.url()}`);

  // Observe dashboard as first-time user
  const bodyText = await page.locator("body").innerText();
  if (/website/i.test(bodyText) === false) {
    note("high", "dashboard", "No obvious Website CTA visible in first land");
  }
  // Find path to create website
  const websiteNav = page.getByRole("link", { name: /^Website$/i }).first();
  if (await websiteNav.count()) {
    await websiteNav.click();
    await page.waitForLoadState("networkidle");
  } else {
    await page.goto(`${BASE}/website`, { waitUntil: "networkidle" });
    note("medium", "nav", "Had to navigate to /website directly — no clear Website nav click worked");
  }
  await shot(page, "website-list");
  note("info", "website", `Website list URL=${page.url()}`);

  // Create new
  const createBtn = page.getByRole("link", { name: /create|new website|new site|add/i }).first();
  if (await createBtn.count()) {
    await createBtn.click();
  } else {
    await page.goto(`${BASE}/website/new`, { waitUntil: "networkidle" });
    note("medium", "create", "No obvious Create button; went to /website/new directly");
  }
  await page.waitForLoadState("networkidle");
  await shot(page, "create-path");
  note("info", "create", `Create path URL=${page.url()}`);

  // Choose AI generate
  const aiPath = page.getByRole("button", { name: /Generate with AI/i }).first();
  if (await aiPath.count()) {
    await aiPath.click();
  } else {
    await page.goto(`${BASE}/website/new/ai`, { waitUntil: "networkidle" });
    note("medium", "create", "AI path button not found; navigated to /website/new/ai");
  }
  await page.waitForLoadState("networkidle");
  await shot(page, "ai-form");
  note("info", "generate", `AI create URL=${page.url()}`);

  // Fill AI generation form — discover fields
  const labels = await page.locator("label").allTextContents();
  note("info", "generate", `Form labels: ${labels.map((l) => l.trim()).filter(Boolean).join(" | ").slice(0, 500)}`);

  // Common fields
  async function fillIfExists(selectors, value) {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.fill(value);
        return true;
      }
    }
    return false;
  }

  const filledBusiness = await fillIfExists(
    [
      "#businessName",
      'input[name="businessName"]',
      'input[name="name"]',
      'label:has-text("Business") >> .. >> input',
      'label:has-text("Site name") >> .. >> input',
      'label:has-text("Company") >> .. >> input',
    ],
    "Lotus Jewellery",
  );
  if (!filledBusiness) {
    // try first text input
    const firstInput = page.locator('form input[type="text"], form input:not([type])').first();
    if (await firstInput.count()) {
      await firstInput.fill("Lotus Jewellery");
      note("medium", "generate", "Could not find labeled business name; filled first text input");
    } else {
      note("critical", "generate", "Could not find business name field");
    }
  }

  const filledDesc = await fillIfExists(
    [
      "textarea",
      'textarea[name="description"]',
      'textarea[name="prompt"]',
      'textarea[name="about"]',
    ],
    "We craft handcrafted gold and diamond jewellery in Mumbai. Elegant bridal and everyday collections with personal consultation.",
  );
  if (!filledDesc) note("high", "generate", "No description/prompt textarea found");

  // Industry / category selects if present
  const select = page.locator("select").first();
  if (await select.count()) {
    const options = await select.locator("option").allTextContents();
    note("info", "generate", `Select options: ${options.join(", ").slice(0, 300)}`);
    const jewellery = options.findIndex((o) => /jewel/i.test(o));
    if (jewellery >= 0) await select.selectOption({ index: jewellery });
    else if (options.length > 1) await select.selectOption({ index: 1 });
  }

  await shot(page, "ai-form-filled");
  const generateBtn = page.getByRole("button", { name: /Generate website|Generate|Create site|Create website/i }).first();
  if (!(await generateBtn.count())) {
    note("critical", "generate", "No Generate button found");
    await dumpAndExit(browser);
    return;
  }
  const genStart = Date.now();
  await generateBtn.click();
  note("info", "generate", "Clicked generate");

  // Wait for generation result / navigation
  try {
    await Promise.race([
      page.waitForURL(/\/website\/[^/]+/, { timeout: 180000 }),
      page.waitForSelector("text=/ready|generated|open editor|edit|publish|success/i", { timeout: 180000 }),
    ]);
  } catch {
    note("critical", "generate", `Generation did not complete in 180s. URL=${page.url()}`);
  }
  const genMs = Date.now() - genStart;
  note(genMs > 60000 ? "high" : "info", "generate", `Generation wait ${Math.round(genMs / 1000)}s → ${page.url()}`);
  await shot(page, "post-generate");

  // Capture any visible errors
  const alerts = await page.locator("[role='alert'], .text-red-600, .text-rose-600, [class*='error']").allTextContents();
  for (const a of alerts.filter((t) => t.trim()).slice(0, 5)) {
    note("high", "generate", `Visible error/alert: ${a.trim().slice(0, 240)}`);
  }

  // Find site id and go to pages / editor
  let siteId = null;
  const m = page.url().match(/\/website\/([0-9a-f-]{36}|[A-Za-z0-9_-]{10,})/);
  if (m) siteId = m[1];
  if (!siteId) {
    // try from links
    const href = await page.locator('a[href*="/website/"]').first().getAttribute("href");
    const hm = href && href.match(/\/website\/([^/?#]+)/);
    if (hm) siteId = hm[1];
  }
  if (!siteId) {
    note("critical", "generate", "Could not determine siteId after generation");
    await dumpAndExit(browser);
    return;
  }
  note("info", "site", `siteId=${siteId}`);

  // Open pages list / home page editor
  await page.goto(`${BASE}/website/${siteId}/pages`, { waitUntil: "networkidle" });
  await shot(page, "pages-list");
  const pageLink = page.locator(`a[href*="/website/${siteId}/pages/"]`).first();
  if (await pageLink.count()) {
    await pageLink.click();
    await page.waitForLoadState("networkidle");
  } else {
    note("critical", "edit", "No page links found to edit");
  }
  await shot(page, "page-editor");
  note("info", "edit", `Editor URL=${page.url()}`);

  // Wait for page builder dynamic load
  await page.waitForTimeout(2000);
  const editorBody = await page.locator("body").innerText();
  if (/Loading page builder/i.test(editorBody)) {
    note("medium", "edit", "Saw 'Loading page builder…' — client dynamic import delay");
    await page.waitForTimeout(5000);
  }
  if (/something went wrong|error|failed/i.test(editorBody) && /page builder|editor/i.test(editorBody)) {
    note("critical", "edit", "Editor shows an error state");
  }

  // Try a simple edit
  const titleInput = page.locator('input[name="title"], input[value], textarea').first();
  let edited = false;
  // Prefer contenteditable / section fields
  const contentField = page.getByLabel(/Headline|Title|Heading|Hero/i).first();
  if (await contentField.count()) {
    await contentField.fill("Handcrafted Jewellery for Every Moment");
    edited = true;
  } else {
    const textareas = page.locator("textarea");
    if (await textareas.count()) {
      await textareas.first().fill("Handcrafted Jewellery for Every Moment — bridal and everyday pieces.");
      edited = true;
    }
  }
  if (!edited) note("high", "edit", "Could not find an obvious editable content field in page editor");
  else note("info", "edit", "Edited a content field");

  // Save
  const saveBtn = page.getByRole("button", { name: /Save|Save changes|Save page/i }).first();
  if (await saveBtn.count()) {
    await saveBtn.click();
    await page.waitForTimeout(2000);
    const saveText = await page.locator("body").innerText();
    if (/saved|success/i.test(saveText)) note("info", "edit", "Save appears successful");
    else note("medium", "edit", "Clicked Save but no clear saved confirmation");
  } else {
    note("high", "edit", "No Save button found in editor");
  }
  await shot(page, "after-edit");

  // Publish
  await page.goto(`${BASE}/website/${siteId}/publish`, { waitUntil: "networkidle" });
  await shot(page, "publish-page");
  note("info", "publish", `Publish URL=${page.url()}`);
  const publishText = await page.locator("body").innerText();
  note("info", "publish", `Publish screen excerpt: ${publishText.replace(/\s+/g, " ").slice(0, 400)}`);

  const publishBtn = page.getByRole("button", { name: /Publish|Go live|Make live|Publish site/i }).first();
  if (!(await publishBtn.count())) {
    note("critical", "publish", "No Publish button found");
  } else {
    await publishBtn.click();
    await page.waitForTimeout(3000);
    await shot(page, "after-publish");
    const after = await page.locator("body").innerText();
    if (/published|live|success/i.test(after)) note("info", "publish", "Publish confirmation text seen");
    else note("high", "publish", "No clear publish success confirmation");
    const errAfter = await page.locator("[role='alert'], .text-red-600, .text-rose-600").allTextContents();
    for (const a of errAfter.filter((t) => t.trim()).slice(0, 5)) {
      note("critical", "publish", `Publish error: ${a.trim().slice(0, 240)}`);
    }
  }

  // Find live URL
  let liveUrl = null;
  const liveLink = page.locator('a[href*="/p/"], a[href*="/site"], a:has-text("View live"), a:has-text("Open site")').first();
  if (await liveLink.count()) {
    liveUrl = await liveLink.getAttribute("href");
  }
  // Fallback: slug from DB-ish path /p/slug
  if (!liveUrl) {
    // try any preview link
    const anchors = await page.locator("a[href]").evaluateAll((as) =>
      as.map((a) => a.getAttribute("href")).filter(Boolean),
    );
    liveUrl = anchors.find((h) => /\/p\//.test(h) || /\/site/.test(h)) || null;
    note("medium", "publish", `Candidate links: ${anchors.filter((h) => /p\/|site|live|preview/i.test(h)).slice(0, 10).join(", ")}`);
  }
  if (liveUrl && liveUrl.startsWith("/")) liveUrl = `${BASE}${liveUrl}`;
  if (!liveUrl) {
    // Guess common public path from slug
    liveUrl = `${BASE}/p/lotus-jewellery`;
    note("medium", "live", `No live URL in UI; trying guessed ${liveUrl}`);
  }
  note("info", "live", `Visiting ${liveUrl}`);
  const liveResp = await page.goto(liveUrl, { waitUntil: "networkidle" });
  await shot(page, "live-site");
  const status = liveResp?.status();
  note(status && status >= 400 ? "critical" : "info", "live", `Live response status=${status} URL=${page.url()}`);
  const liveBody = await page.locator("body").innerText();
  if (/not found|404|unpublished|draft|coming soon/i.test(liveBody)) {
    note("critical", "live", `Live page looks unavailable: ${liveBody.replace(/\s+/g, " ").slice(0, 200)}`);
  } else if (liveBody.trim().length < 40) {
    note("critical", "live", "Live page nearly empty");
  } else {
    note("info", "live", `Live content excerpt: ${liveBody.replace(/\s+/g, " ").slice(0, 280)}`);
  }

  await dumpAndExit(browser);
}

async function dumpAndExit(browser) {
  const report = path.join(OUT, "report.json");
  fs.writeFileSync(report, JSON.stringify({ notes, base: BASE }, null, 2));
  console.log(`\nWrote ${report} (${notes.length} notes)`);
  await browser.close();
}

main().catch(async (err) => {
  note("critical", "runner", err.stack || String(err));
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes }, null, 2));
  process.exit(1);
});
