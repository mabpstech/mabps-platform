/**
 * Launch Blocker Sprint — verify P0s + full signup → generate → publish.
 * Fails if any critical blocker remains or manual intervention is required.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.MABPS_BASE_URL || "http://localhost:3000";
const stamp = Date.now();
const EMAIL = `launch.blocker.${stamp}@example.com`;
const PASSWORD = "Welcome123!";
const WORKSPACE = `Lotus Launch ${stamp}`;
const OUT = path.join(process.cwd(), "tmp/launch-blocker-verify");
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

  // --- P0.5 Google OAuth copy matches availability ---
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const loginCopy = await page.locator("body").innerText();
  const loginMentionsGoogle = /google/i.test(loginCopy);
  const hasGoogleBtn = (await page.getByRole("button", { name: /google/i }).count()) > 0;
  if (loginMentionsGoogle && !hasGoogleBtn) {
    note("critical", "oauth", "Login copy mentions Google but no Google button is shown");
  } else if (!loginMentionsGoogle && !hasGoogleBtn) {
    note("info", "oauth", "Login copy correctly omits Google when OAuth is disabled");
  } else {
    note("info", "oauth", "Login Google copy matches button availability");
  }

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  const signupCopy = await page.locator("body").innerText();
  const signupMentionsGoogle = /google/i.test(signupCopy);
  const signupGoogleBtn = (await page.getByRole("button", { name: /google/i }).count()) > 0;
  if (signupMentionsGoogle && !signupGoogleBtn) {
    note("critical", "oauth", "Signup copy mentions Google but no Google button is shown");
  } else {
    note("info", "oauth", "Signup Google copy aligned with availability");
  }

  // --- P0.4 Hide slug / Logo URL on first-time signup ---
  if (await page.getByLabel(/slug/i).count()) {
    note("critical", "onboarding", "Signup still shows Slug field");
  } else {
    note("info", "onboarding", "Signup hides Slug field");
  }
  if (await page.getByLabel(/logo url/i).count()) {
    note("critical", "onboarding", "Signup still shows Logo URL field");
  } else {
    note("info", "onboarding", "Signup hides Logo URL field");
  }

  // --- Signup ---
  await page.getByLabel(/^Name$/i).fill("Priya Launch");
  await page.getByLabel(/^Email$/i).fill(EMAIL);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByLabel(/workspace name/i).fill(WORKSPACE);
  await page.getByRole("button", { name: /create account/i }).click();
  try {
    await page.waitForURL(/\/(dashboard|onboarding|website)/, { timeout: 30000 });
  } catch {
    note("critical", "signup", `Signup did not leave signup page. URL=${page.url()}`);
    await shot(page, "signup-stuck");
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes, failed }, null, 2));
    await browser.close();
    process.exit(1);
  }
  note("info", "signup", `Landed on ${page.url()} as ${EMAIL}`);
  await shot(page, "post-signup");

  // Active org after signup
  let session = await page.evaluate(async () => {
    const r = await fetch("/api/auth/get-session");
    return r.json();
  });
  if (!session?.session?.activeOrganizationId) {
    note("critical", "session", "activeOrganizationId MISSING immediately after signup");
  } else {
    note("info", "session", `activeOrganizationId set after signup: ${session.session.activeOrganizationId}`);
  }

  // --- Logout + login (P0.1) ---
  const signOut = page.getByRole("button", { name: /sign out/i });
  if (await signOut.count()) {
    await signOut.click();
    await page.waitForURL(/\/(login|signup|$)/, { timeout: 15000 }).catch(() => null);
  } else {
    await page.goto(`${BASE}/api/auth/sign-out`, { waitUntil: "networkidle" }).catch(() => null);
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
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
  const activeOrg = session?.session?.activeOrganizationId;
  if (!activeOrg) {
    note(
      "critical",
      "session",
      "After login activeOrganizationId=MISSING — would require manual set-active",
    );
  } else {
    note("info", "session", `After login activeOrganizationId=${activeOrg}`);
  }

  // --- Generate ---
  await page.goto(`${BASE}/website/new/ai`, { waitUntil: "networkidle" });
  await shot(page, "ai-form");
  const example = page.getByRole("button", { name: /Jewellery Store/i });
  if (await example.count()) {
    await example.click();
  } else {
    await page.locator("textarea").first().fill(
      "A luxury jewellery store specializing in handcrafted gold and diamond pieces for modern celebrations.",
    );
  }

  const genBtn = page.getByRole("button", { name: /Generate website/i });
  const t0 = Date.now();
  await genBtn.click();
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
      `Generation failed without navigation. Excerpt: ${body.replace(/\s+/g, " ").slice(0, 300)}`,
    );
    await shot(page, "generate-failed");
    fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes, failed }, null, 2));
    await browser.close();
    process.exit(1);
  }
  await shot(page, "post-generate");

  const siteMatch = page.url().match(/\/website\/([^/]+)/);
  const siteId = siteMatch?.[1];
  note("info", "site", `siteId=${siteId}`);

  // --- P0.2 Never brand as New website ---
  const pagesText = await page.locator("body").innerText();
  if (/\bNew website\b/i.test(pagesText)) {
    note("critical", "branding", "Generated site still titled 'New website'");
  } else if (new RegExp(WORKSPACE.split(" ")[0], "i").test(pagesText)) {
    note("info", "branding", `Site uses workspace branding (found workspace signal)`);
  } else {
    note("info", "branding", "No 'New website' placeholder in builder chrome");
  }

  // --- Publish ---
  await page.goto(`${BASE}/website/${siteId}/publish`, { waitUntil: "networkidle" });
  await shot(page, "publish");
  const pubBtn = page.getByRole("button", { name: /Publish|Go live|Make live/i }).first();
  if (!(await pubBtn.count())) {
    note("critical", "publish", "No publish button");
  } else {
    await pubBtn.click({ force: true });
    await page.waitForTimeout(4000);
    await shot(page, "after-publish");
    note("info", "publish", "Clicked publish");
  }

  const site = await page.evaluate(async (id) => {
    const r = await fetch(`/api/website/sites/${id}`);
    return r.json().catch(() => ({}));
  }, siteId);
  const slug = site?.site?.slug || site?.slug;
  const siteName = site?.site?.name || site?.name;
  note("info", "site", `API name=${siteName} slug=${slug}`);
  if (/^new website$/i.test(String(siteName || ""))) {
    note("critical", "branding", "API site name is still 'New website'");
  }
  if (/^new-website$/i.test(String(slug || ""))) {
    note("critical", "branding", "API site slug is still 'new-website'");
  }

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
    if (/\bNew website\b/i.test(liveBody)) {
      note("critical", "branding", "Live public page still shows 'New website'");
    }
  }

  // --- P0.3 Site usage counters after deletion ---
  const usageBefore = await page.evaluate(async () => {
    const r = await fetch("/api/website/sites");
    const data = await r.json().catch(() => ({}));
    return {
      count: Array.isArray(data?.sites)
        ? data.sites.length
        : Array.isArray(data)
          ? data.length
          : null,
      raw: data,
    };
  });
  note("info", "usage", `Sites before delete probe: ${JSON.stringify(usageBefore).slice(0, 200)}`);

  const del = await page.evaluate(async (id) => {
    const r = await fetch(`/api/website/sites/${id}`, { method: "DELETE" });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }, siteId);
  note(
    del.status >= 400 ? "critical" : "info",
    "usage",
    `Delete status=${del.status} body=${JSON.stringify(del.body).slice(0, 200)}`,
  );

  // Recreate limit check: if counter drifted high, generate/create would fail
  await page.goto(`${BASE}/website`, { waitUntil: "networkidle" });
  const websitePage = await page.locator("body").innerText();
  if (/0\s*\/\s*\d+\s*sites|sites used:\s*0/i.test(websitePage) || /no websites yet|create/i.test(websitePage)) {
    note("info", "usage", "Website list looks clear after deletion");
  }
  // Probe entitlement via attempting create API with a tiny site
  const recreate = await page.evaluate(async () => {
    const r = await fetch("/api/website/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Counter Check Site" }),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  });
  if (recreate.status === 201 || recreate.status === 200) {
    note("info", "usage", "Can create a site after deletion — counters OK");
    const newId = recreate.body?.site?.id || recreate.body?.id || recreate.body?.siteId;
    if (newId) {
      await page.evaluate(async (id) => {
        await fetch(`/api/website/sites/${id}`, { method: "DELETE" });
      }, newId);
    }
  } else if (/limit|upgrade|plan/i.test(JSON.stringify(recreate.body))) {
    note(
      "critical",
      "usage",
      `Site create blocked after delete — counter drift: ${JSON.stringify(recreate.body).slice(0, 250)}`,
    );
  } else {
    note(
      "high",
      "usage",
      `Unexpected recreate status=${recreate.status} ${JSON.stringify(recreate.body).slice(0, 200)}`,
    );
  }

  fs.writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify({ notes, failed, email: EMAIL, workspace: WORKSPACE }, null, 2),
  );
  console.log("Wrote", path.join(OUT, "report.json"));
  await browser.close();
  if (failed) process.exit(1);
}

main().catch((e) => {
  note("critical", "runner", e.stack || String(e));
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ notes, failed: true }, null, 2));
  process.exit(1);
});
