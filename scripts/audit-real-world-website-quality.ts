/**
 * Real-world validation: generate websites for 100 real businesses, compare
 * against each company's existing site (when reachable), and score quality.
 *
 * Run: npx tsx scripts/audit-real-world-website-quality.ts
 *
 * Uses deterministic pipeline (skipLlm). Does not persist sites.
 * Optional: SKIP_FETCH=1 to score generated sites only (no live comparison).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyHeroToBlueprint,
  composeWebsite,
  createGenerationPlan,
  deriveBrandStrategy,
  deriveBusinessDna,
  deriveCreativeDirection,
  deriveWebsitePlan,
  planBusinessFromPrompt,
  planWebsiteFromBusinessPlan,
  runGenerationPlan,
} from "../lib/website/ai";
import { analyzeBusinessPrompt } from "../lib/website/ai/intelligence";
import type {
  AiGeneratedSection,
  AiWebsiteBlueprint,
} from "../lib/website/ai/types";

type BusinessRow = {
  id: string;
  name: string;
  industry: string;
  url: string;
  city: string;
  prompt: string;
};

type SectionSnap = {
  type: string;
  heading: string;
  subheading: string;
  body: string;
  cta: string;
  itemTitles: string[];
};

type DimensionScores = {
  heroQuality: number;
  trust: number;
  visualHierarchy: number;
  services: number;
  cta: number;
  navigation: number;
  missingSections: number;
  seoTitle: number;
  overallProfessionalism: number;
};

type LiveSiteSnap = {
  reachable: boolean;
  status: number | null;
  title: string;
  h1: string;
  description: string;
  navLabels: string[];
  ctaHints: string[];
  error?: string;
};

type AuditRow = {
  id: string;
  name: string;
  industry: string;
  url: string;
  score: number;
  dimensions: DimensionScores;
  weaknesses: string[];
  heroHeadline: string;
  heroCta: string;
  seoDefaultTitle: string;
  pageSeoTitle: string;
  navLabels: string[];
  sectionTypes: string[];
  category: string;
  heroStyle: string;
  live: LiveSiteSnap;
  comparisonNotes: string[];
};

const BUSINESSES_PATH = resolve(
  process.cwd(),
  "scripts/data/real-businesses-100.json",
);
const REPORT_PATH = resolve(
  process.cwd(),
  "scripts/audit-real-world-website-quality.report.json",
);
const WEAKEST_PATH = resolve(
  process.cwd(),
  "scripts/audit-real-world-website-quality.weakest.md",
);

const GENERIC_PHRASES = [
  "what we offer",
  "why choose",
  "ready to work with",
  "get in touch",
  "learn more",
  "built for",
  "clear solutions that move work forward",
  "get .* built around your goals",
  "website visitors",
  "customers who value quality",
  "without the noise",
  "a core part of what",
  "trust signals that matter",
  "proof that builds confidence",
  "product catalog",
  "highlight",
  "item 1",
];

const WEAK_HEADLINE_PATTERNS = [
  /^welcome to/i,
  /^discover our/i,
  /^your (trusted|one.?stop)/i,
  /best in (class|town|the city)/i,
  /we are (passionate|dedicated|committed)/i,
  /^get .+ built around your goals$/i,
  /^clear solutions that move work forward$/i,
  /^simple .+ with lasting clarity$/i,
  /^discover product catalog/i,
  /^trust signals that matter$/i,
  /^proof that builds confidence$/i,
  /^what you can expect$/i,
];

const EXPECTED_BY_INDUSTRY: Record<string, string[]> = {
  Jewellery: ["products", "collections", "gallery", "contact"],
  Hospital: ["about", "contact", "form"],
  Restaurant: ["gallery", "contact", "cta"],
  "Law Firm": ["about", "contact"],
  "Interior Design": ["gallery", "about", "contact"],
  "Travel Agency": ["about", "contact", "cta"],
  Gym: ["about", "contact", "cta"],
  School: ["about", "contact"],
  "Meditation Centre": ["about", "contact"],
  Photography: ["gallery", "about", "contact"],
  Hotel: ["gallery", "about", "contact", "cta"],
  "Dental Clinic": ["about", "contact", "form"],
  "Fashion Brand": ["products", "collections", "contact"],
  Bakery: ["gallery", "products", "contact"],
  "Real Estate": ["about", "contact", "form"],
  SaaS: ["about", "contact", "cta"],
  NGO: ["about", "contact", "cta"],
  "Event Management": ["gallery", "about", "contact"],
  "Beauty Salon": ["about", "contact", "cta"],
  "Electronics Store": ["products", "contact"],
  "Furniture Store": ["products", "collections", "contact"],
  "Accounting Firm": ["about", "contact"],
  "Car Dealership": ["about", "contact", "cta"],
  "Pet Clinic": ["about", "contact", "form"],
  "Yoga Studio": ["about", "contact", "cta"],
  "Coaching Centre": ["about", "contact", "form"],
  "Construction Company": ["about", "gallery", "contact"],
  Cafe: ["gallery", "contact", "cta"],
  "Digital Agency": ["about", "contact", "cta"],
  "Home Decor": ["products", "collections", "contact"],
};

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value * 10) / 10));
}

function average(values: number[]): number {
  if (!values.length) return 1;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function snapSection(section: AiGeneratedSection): SectionSnap {
  const c = section.content;
  const items = Array.isArray(c.items) ? c.items : [];
  const itemTitles = items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const row = item as Record<string, unknown>;
      return textOf(row.title || row.name);
    })
    .filter(Boolean);

  return {
    type: section.type,
    heading: textOf(c.heading || c.headline),
    subheading: textOf(c.subheading || c.subheadline || c.body),
    body: textOf(c.html || c.body || c.description),
    cta: textOf(c.primaryLabel || c.buttonLabel || c.primaryCTA),
    itemTitles,
  };
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, prop: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${prop}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return stripTags(match[1]);
  }
  return "";
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function extractH1(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]).slice(0, 160) : "";
}

function extractNavLabels(html: string): string[] {
  const navBlocks = html.match(/<nav[\s\S]*?<\/nav>/gi) || [];
  const labels = new Set<string>();
  for (const block of navBlocks.slice(0, 3)) {
    const links = block.match(/<a[^>]*>([\s\S]*?)<\/a>/gi) || [];
    for (const link of links) {
      const text = stripTags(link);
      if (text && text.length <= 32 && text.length >= 2) labels.add(text);
      if (labels.size >= 12) break;
    }
  }
  return [...labels];
}

function extractCtaHints(html: string): string[] {
  const blob = stripTags(html).toLowerCase();
  const hints = [
    "book",
    "buy",
    "shop",
    "reserve",
    "appointment",
    "contact",
    "enquire",
    "get started",
    "sign up",
    "donate",
    "visit",
    "call",
  ];
  return hints.filter((h) => blob.includes(h));
}

async function fetchLiveSite(url: string): Promise<LiveSiteSnap> {
  const empty: LiveSiteSnap = {
    reachable: false,
    status: null,
    title: "",
    h1: "",
    description: "",
    navLabels: [],
    ctaHints: [],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MABPSQualityAudit/1.0; +https://mabps.local)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    const html = await response.text();
    if (!response.ok || html.length < 200) {
      return {
        ...empty,
        reachable: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }
    return {
      reachable: true,
      status: response.status,
      title: extractTitle(html).slice(0, 140),
      h1: extractH1(html),
      description: extractMeta(html, "description").slice(0, 200),
      navLabels: extractNavLabels(html),
      ctaHints: extractCtaHints(html),
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function generateBlueprint(prompt: string) {
  const plannerResult = await planBusinessFromPrompt(
    { prompt },
    { skipLlm: true },
  );
  const websitePlannerResult = await planWebsiteFromBusinessPlan(
    { businessPlan: plannerResult.plan, prompt },
    { skipLlm: true },
  );
  const generationPlan = createGenerationPlan({
    businessPlan: plannerResult.plan,
    websitePlan: websitePlannerResult.plan,
  });
  const generationRun = await runGenerationPlan(
    {
      businessPlan: plannerResult.plan,
      websitePlan: websitePlannerResult.plan,
      plan: generationPlan,
    },
    { skipLlm: true },
  );

  const bi = await analyzeBusinessPrompt({ prompt });
  const profile = bi.profile;
  const dna = (await deriveBusinessDna({ profile })).dna;
  const strategy = (await deriveBrandStrategy({ dna })).strategy;
  const plan = (await deriveWebsitePlan({ profile, dna, strategy })).plan;
  await deriveCreativeDirection({ dna, strategy, plan });

  const composed = await composeWebsite({
    profile,
    dna,
    strategy,
    plan,
    prompt,
  });
  const heroApply = applyHeroToBlueprint(composed.blueprint, generationRun);

  return {
    blueprint: heroApply.blueprint as AiWebsiteBlueprint,
    profile,
    heroStyle: generationRun.hero?.style || "",
  };
}

function scoreHero(
  hero: SectionSnap | undefined,
  live: LiveSiteSnap,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 7;
  if (!hero?.heading) {
    notes.push("Missing hero headline");
    return { score: 2, notes };
  }
  if (hero.heading.split(/\s+/).length > 14) {
    score -= 2;
    notes.push("Hero headline too long");
  }
  for (const pattern of WEAK_HEADLINE_PATTERNS) {
    if (pattern.test(hero.heading)) {
      score -= 3;
      notes.push(`Weak hero pattern: "${hero.heading}"`);
      break;
    }
  }
  if (!hero.subheading) {
    score -= 1;
    notes.push("Hero missing subheadline");
  }
  if (!hero.cta) {
    score -= 2;
    notes.push("Hero missing primary CTA");
  }
  if (/get in touch|learn more|contact us/i.test(hero.cta)) {
    score -= 1;
    notes.push(`Generic hero CTA: "${hero.cta}"`);
  }
  if (live.reachable && live.h1) {
    const liveWords = new Set(live.h1.toLowerCase().split(/\W+/).filter(Boolean));
    const genWords = hero.heading.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = genWords.filter((w) => liveWords.has(w)).length;
    if (overlap === 0 && genWords.length > 2) {
      // Not a penalty — different copy is fine — but note brand specificity
      if (!/brand|specific|named/i.test(hero.heading)) {
        /* keep score */
      }
    }
  }
  return { score: clampScore(score), notes };
}

function scoreTrust(
  sections: SectionSnap[],
  profileTrust: string[],
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 6;
  const trustish = sections.filter(
    (s) =>
      /trust|proof|about|testimonial|credential/i.test(s.type + s.heading) ||
      /trust|proof|credential|guarantee|certified|award/i.test(
        `${s.heading} ${s.itemTitles.join(" ")}`,
      ),
  );
  if (!trustish.length && profileTrust.length === 0) {
    score -= 3;
    notes.push("No trust/proof signals on home");
  } else if (trustish.length) {
    score += 1;
  }
  const blob = sections
    .map((s) => `${s.heading} ${s.itemTitles.join(" ")}`)
    .join(" ")
    .toLowerCase();
  if (/trust signals that matter|proof that builds confidence/.test(blob)) {
    score -= 2;
    notes.push("Trust section uses meta/template headings");
  }
  if (profileTrust.length >= 2) score += 1;
  return { score: clampScore(score), notes };
}

function scoreVisualHierarchy(sections: SectionSnap[]): {
  score: number;
  notes: string[];
} {
  const notes: string[] = [];
  let score = 7;
  const content = sections.filter((s) => s.type !== "spacer");
  if (!content.length || content[0]?.type !== "hero") {
    score -= 3;
    notes.push("Home does not start with a single hero");
  }
  const heroes = content.filter((s) => s.type === "hero");
  if (heroes.length > 1) {
    score -= 2;
    notes.push(`Multiple heroes (${heroes.length})`);
  }
  for (let i = 1; i < content.length; i++) {
    if (content[i - 1]!.type === content[i]!.type && content[i]!.type !== "spacer") {
      score -= 1;
      notes.push(`Adjacent duplicate ${content[i]!.type}`);
      break;
    }
  }
  if (content.length < 3) {
    score -= 2;
    notes.push("Sparse home layout");
  }
  if (content.length > 10) {
    score -= 1;
    notes.push("Home feels overcrowded");
  }
  const featureCount = content.filter((s) => s.type === "features").length;
  if (featureCount > 2) {
    score -= 2;
    notes.push(`Too many feature blocks (${featureCount})`);
  }
  return { score: clampScore(score), notes };
}

function scoreServices(
  sections: SectionSnap[],
  industry: string,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 6;
  const serviceBlocks = sections.filter((s) =>
    ["features", "products", "collections", "richText"].includes(s.type),
  );
  if (!serviceBlocks.length) {
    score -= 3;
    notes.push("No services/offer content block");
  } else {
    const titles = serviceBlocks.flatMap((s) => s.itemTitles);
    if (titles.length >= 3) score += 2;
    else if (titles.length === 0) {
      score -= 1;
      notes.push("Service section has no concrete items");
    }
    if (titles.some((t) => /^(highlight|item \d+|product catalog)$/i.test(t))) {
      score -= 2;
      notes.push("Service items look like placeholders");
    }
  }
  const blob = sections.map((s) => s.heading).join(" ").toLowerCase();
  if (/what we offer|what you can expect/.test(blob)) {
    score -= 1;
    notes.push("Services heading is generic");
  }
  if (/jewel|fashion|furniture|decor|electronics|bakery/i.test(industry)) {
    if (!sections.some((s) => s.type === "products" || s.type === "collections")) {
      score -= 1;
      notes.push("Retail industry missing products/collections");
    }
  }
  return { score: clampScore(score), notes };
}

function scoreCta(
  sections: SectionSnap[],
  headerCta: string,
  live: LiveSiteSnap,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 6;
  const hero = sections.find((s) => s.type === "hero");
  const ctaSection = sections.find((s) => s.type === "cta");
  const ctas = [hero?.cta, ctaSection?.cta, headerCta].filter(Boolean) as string[];
  if (!ctas.length) {
    notes.push("No CTA found on home or header");
    return { score: 2, notes };
  }
  score += 1;
  if (ctaSection) score += 1;
  if (ctas.some((c) => /get in touch|learn more|contact us/i.test(c))) {
    score -= 1;
    notes.push("CTA leans generic");
  }
  if (live.reachable && live.ctaHints.length) {
    const joined = ctas.join(" ").toLowerCase();
    const matched = live.ctaHints.some((h) => joined.includes(h));
    if (!matched) {
      notes.push(
        `CTA intent may mismatch live site actions (${live.ctaHints.slice(0, 3).join(", ")})`,
      );
      score -= 0.5;
    }
  }
  return { score: clampScore(score), notes };
}

function scoreNavigation(
  navLabels: string[],
  pageTypes: string[],
  live: LiveSiteSnap,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 6;
  if (navLabels.length < 2) {
    score -= 3;
    notes.push("Navigation too thin");
  } else if (navLabels.length >= 3 && navLabels.length <= 7) {
    score += 2;
  } else if (navLabels.length > 8) {
    score -= 1;
    notes.push("Navigation overcrowded");
  }
  if (!pageTypes.includes("contact") && !pageTypes.includes("about")) {
    score -= 1;
    notes.push("Missing About/Contact in page set");
  }
  if (live.reachable && live.navLabels.length >= 3) {
    const liveLower = live.navLabels.map((l) => l.toLowerCase());
    const overlap = navLabels.filter((l) =>
      liveLower.some(
        (x) => x.includes(l.toLowerCase()) || l.toLowerCase().includes(x),
      ),
    );
    if (overlap.length === 0) {
      notes.push("Nav labels diverge from live site IA");
      score -= 0.5;
    }
  }
  return { score: clampScore(score), notes };
}

function scoreMissingSections(
  sectionTypes: string[],
  pageTypes: string[],
  industry: string,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 8;
  const expected = EXPECTED_BY_INDUSTRY[industry] || ["about", "contact", "cta"];
  const present = new Set([...sectionTypes, ...pageTypes]);
  const missing = expected.filter((item) => !present.has(item));
  if (missing.length) {
    score -= Math.min(5, missing.length * 1.5);
    notes.push(`Missing expected: ${missing.join(", ")}`);
  }
  if (!sectionTypes.includes("hero")) {
    score -= 3;
    notes.push("Missing hero");
  }
  if (!sectionTypes.includes("cta") && !sectionTypes.includes("form")) {
    score -= 1;
    notes.push("Missing closing CTA/form");
  }
  return { score: clampScore(score), notes };
}

function scoreSeoTitle(
  siteTitle: string,
  pageSeoTitle: string,
  businessName: string,
  industry: string,
  live: LiveSiteSnap,
): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 5;
  const effective = pageSeoTitle || siteTitle;
  if (!effective) {
    notes.push("No SEO title generated");
    return { score: 2, notes };
  }
  if (effective === businessName) {
    score -= 2;
    notes.push("SEO title is only the business name");
  }
  if (
    /jewellery|hospital|restaurant|law|hotel|dental|fashion|saas|gym|school/i.test(
      effective,
    ) ||
    effective.toLowerCase().includes(industry.toLowerCase().split(" ")[0] || "")
  ) {
    score += 2;
  } else if (pageSeoTitle) {
    score += 1;
  } else {
    notes.push("SEO title lacks industry/service context");
    score -= 1;
  }
  if (effective.length > 65) {
    score -= 1;
    notes.push("SEO title likely too long");
  }
  if (live.reachable && live.title) {
    if (live.title.length > 10 && effective === businessName) {
      notes.push(
        `Live title is richer ("${live.title.slice(0, 60)}") vs generated name-only`,
      );
      score -= 1;
    }
  }
  return { score: clampScore(score), notes };
}

function scoreProfessionalism(
  dimensions: Omit<DimensionScores, "overallProfessionalism">,
  genericHits: string[],
  poorHeadlines: string[],
): { score: number; notes: string[] } {
  const notes: string[] = [];
  const base = average(Object.values(dimensions));
  let score = base;
  if (genericHits.length >= 3) {
    score -= 1.5;
    notes.push(`Generic phrases: ${genericHits.slice(0, 4).join(", ")}`);
  }
  if (poorHeadlines.length) {
    score -= 1;
    notes.push(`Weak headlines: ${poorHeadlines.slice(0, 2).join("; ")}`);
  }
  return { score: clampScore(score), notes };
}

function auditGenerated(
  business: BusinessRow,
  blueprint: AiWebsiteBlueprint,
  heroStyle: string,
  live: LiveSiteSnap,
): AuditRow {
  const home = blueprint.pages.find((p) => p.pageType === "home");
  const sections = (home?.sections || []).map(snapSection);
  const contentSections = sections.filter((s) => s.type !== "spacer");
  const hero = contentSections.find((s) => s.type === "hero");
  const navLabels = blueprint.navigation.map((n) => n.label).filter(Boolean);
  const pageTypes = blueprint.pages.map((p) => p.pageType);
  const sectionTypes = contentSections.map((s) => s.type);
  const siteTitle = blueprint.seo.defaultTitle || blueprint.site.name || "";
  const pageSeoTitle = home?.seoTitle || "";
  const headerCta = blueprint.header.ctaLabel || "";

  const blob = contentSections
    .map(
      (s) =>
        `${s.heading} ${s.subheading} ${s.body} ${s.cta} ${s.itemTitles.join(" ")}`,
    )
    .join(" ")
    .toLowerCase();
  const genericHits = GENERIC_PHRASES.filter((p) =>
    new RegExp(p, "i").test(blob),
  );
  const poorHeadlines: string[] = [];
  for (const section of contentSections) {
    if (!section.heading) continue;
    for (const pattern of WEAK_HEADLINE_PATTERNS) {
      if (pattern.test(section.heading)) {
        poorHeadlines.push(`${section.type}: "${section.heading}"`);
        break;
      }
    }
  }

  const heroR = scoreHero(hero, live);
  const trustR = scoreTrust(contentSections, blueprint.brand.trustSignals || []);
  const hierarchyR = scoreVisualHierarchy(contentSections);
  const servicesR = scoreServices(contentSections, business.industry);
  const ctaR = scoreCta(contentSections, headerCta, live);
  const navR = scoreNavigation(navLabels, pageTypes, live);
  const missingR = scoreMissingSections(sectionTypes, pageTypes, business.industry);
  const seoR = scoreSeoTitle(
    siteTitle,
    pageSeoTitle,
    business.name,
    business.industry,
    live,
  );

  const partial = {
    heroQuality: heroR.score,
    trust: trustR.score,
    visualHierarchy: hierarchyR.score,
    services: servicesR.score,
    cta: ctaR.score,
    navigation: navR.score,
    missingSections: missingR.score,
    seoTitle: seoR.score,
  };
  const profR = scoreProfessionalism(partial, genericHits, poorHeadlines);
  const dimensions: DimensionScores = {
    ...partial,
    overallProfessionalism: profR.score,
  };
  const score = clampScore(average(Object.values(dimensions)));

  const weaknesses = [
    ...heroR.notes,
    ...trustR.notes,
    ...hierarchyR.notes,
    ...servicesR.notes,
    ...ctaR.notes,
    ...navR.notes,
    ...missingR.notes,
    ...seoR.notes,
    ...profR.notes,
  ];

  const comparisonNotes: string[] = [];
  if (!live.reachable) {
    comparisonNotes.push(
      `Live site unreachable${live.error ? `: ${live.error}` : ""}`,
    );
  } else {
    comparisonNotes.push(
      `Live title: "${live.title.slice(0, 80) || "(none)"}"`,
    );
    if (live.h1) comparisonNotes.push(`Live H1: "${live.h1.slice(0, 80)}"`);
    if (live.navLabels.length) {
      comparisonNotes.push(
        `Live nav sample: ${live.navLabels.slice(0, 6).join(", ")}`,
      );
    }
  }

  return {
    id: business.id,
    name: business.name,
    industry: business.industry,
    url: business.url,
    score,
    dimensions,
    weaknesses: [...new Set(weaknesses)],
    heroHeadline: hero?.heading || "",
    heroCta: hero?.cta || "",
    seoDefaultTitle: siteTitle,
    pageSeoTitle,
    navLabels,
    sectionTypes,
    category: blueprint.brand.category || "",
    heroStyle,
    live,
    comparisonNotes,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const businesses = JSON.parse(
    readFileSync(BUSINESSES_PATH, "utf8"),
  ) as BusinessRow[];
  if (businesses.length !== 100) {
    throw new Error(`Expected 100 businesses, found ${businesses.length}`);
  }

  const skipFetch = process.env.SKIP_FETCH === "1";
  console.log(
    `Real-world validation: ${businesses.length} businesses (skipLlm${skipFetch ? ", SKIP_FETCH" : ""})…\n`,
  );

  const liveSnaps = skipFetch
    ? businesses.map(
        (): LiveSiteSnap => ({
          reachable: false,
          status: null,
          title: "",
          h1: "",
          description: "",
          navLabels: [],
          ctaHints: [],
          error: "SKIP_FETCH",
        }),
      )
    : await mapPool(businesses, 8, async (b) => {
        process.stdout.write(`fetch ${b.id}… `);
        const snap = await fetchLiveSite(b.url);
        console.log(snap.reachable ? "ok" : `fail(${snap.error || snap.status})`);
        return snap;
      });

  const results: AuditRow[] = [];
  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i]!;
    process.stdout.write(`→ [${i + 1}/100] ${business.name}… `);
    try {
      const generated = await generateBlueprint(business.prompt);
      const row = auditGenerated(
        business,
        generated.blueprint,
        generated.heroStyle,
        liveSnaps[i]!,
      );
      results.push(row);
      console.log(
        `score=${row.score} seo=${row.dimensions.seoTitle} hero="${row.heroHeadline.slice(0, 40)}"`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAILED: ${message}`);
      results.push({
        id: business.id,
        name: business.name,
        industry: business.industry,
        url: business.url,
        score: 1,
        dimensions: {
          heroQuality: 1,
          trust: 1,
          visualHierarchy: 1,
          services: 1,
          cta: 1,
          navigation: 1,
          missingSections: 1,
          seoTitle: 1,
          overallProfessionalism: 1,
        },
        weaknesses: [`generation failed: ${message}`],
        heroHeadline: "",
        heroCta: "",
        seoDefaultTitle: "",
        pageSeoTitle: "",
        navLabels: [],
        sectionTypes: [],
        category: "",
        heroStyle: "",
        live: liveSnaps[i]!,
        comparisonNotes: [],
      });
    }
  }

  results.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

  const dimKeys = Object.keys(results[0]!.dimensions) as Array<
    keyof DimensionScores
  >;
  const avgDimensions = Object.fromEntries(
    dimKeys.map((key) => [
      key,
      Math.round(average(results.map((r) => r.dimensions[key])) * 10) / 10,
    ]),
  );

  const weaknessCounts = new Map<string, number>();
  for (const row of results) {
    for (const w of row.weaknesses) {
      const key = w.replace(/".*?"/g, '"…"').slice(0, 120);
      weaknessCounts.set(key, (weaknessCounts.get(key) || 0) + 1);
    }
  }
  const topWeaknesses = [...weaknessCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([reason, count]) => ({ reason, count }));

  const weakest = results.slice(0, 25);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: skipFetch ? "blueprint-skipLlm-no-fetch" : "blueprint-skipLlm-live-compare",
    summary: {
      count: results.length,
      avgScore: Math.round(average(results.map((r) => r.score)) * 10) / 10,
      liveReachable: results.filter((r) => r.live.reachable).length,
      scoreDistribution: {
        "1-3": results.filter((r) => r.score <= 3).length,
        "4-5": results.filter((r) => r.score > 3 && r.score <= 5).length,
        "6-7": results.filter((r) => r.score > 5 && r.score <= 7).length,
        "8-10": results.filter((r) => r.score > 7).length,
      },
      avgDimensions,
      topWeaknesses,
    },
    weakest,
    all: results,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const md = [
    `# Real-world website quality — weakest sites`,
    ``,
    `Generated: ${report.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    `- Businesses: **${report.summary.count}**`,
    `- Average score: **${report.summary.avgScore}/10**`,
    `- Live sites compared: **${report.summary.liveReachable}/${report.summary.count}**`,
    `- Distribution: 1–3: ${report.summary.scoreDistribution["1-3"]}, 4–5: ${report.summary.scoreDistribution["4-5"]}, 6–7: ${report.summary.scoreDistribution["6-7"]}, 8–10: ${report.summary.scoreDistribution["8-10"]}`,
    ``,
    `### Average dimensions`,
    ``,
    ...dimKeys.map((k) => `- ${k}: **${avgDimensions[k]}/10**`),
    ``,
    `### Most common weaknesses`,
    ``,
    ...topWeaknesses.map((w) => `- (${w.count}) ${w.reason}`),
    ``,
    `## Weakest websites`,
    ``,
  ];

  for (const row of weakest) {
    md.push(`### ${row.score}/10 — ${row.name} (${row.industry})`);
    md.push(``);
    md.push(`- URL: ${row.url}`);
    md.push(`- Hero: "${row.heroHeadline}" / CTA: "${row.heroCta}"`);
    md.push(
      `- SEO: default="${row.seoDefaultTitle}" page="${row.pageSeoTitle || "(null)"}"`,
    );
    md.push(
      `- Dimensions: hero ${row.dimensions.heroQuality}, trust ${row.dimensions.trust}, hierarchy ${row.dimensions.visualHierarchy}, services ${row.dimensions.services}, CTA ${row.dimensions.cta}, nav ${row.dimensions.navigation}, missing ${row.dimensions.missingSections}, SEO ${row.dimensions.seoTitle}, professionalism ${row.dimensions.overallProfessionalism}`,
    );
    md.push(`- Why weak:`);
    for (const w of row.weaknesses.slice(0, 8)) md.push(`  - ${w}`);
    for (const n of row.comparisonNotes.slice(0, 3)) md.push(`  - ${n}`);
    md.push(``);
  }

  writeFileSync(WEAKEST_PATH, md.join("\n"));

  console.log("\n========== WEAKEST (25) ==========");
  for (const row of weakest) {
    console.log(
      `${String(row.score).padStart(4)}  ${row.name.padEnd(28)}  ${row.industry.padEnd(20)}  SEO=${row.dimensions.seoTitle}  ${row.weaknesses[0] || ""}`,
    );
  }
  console.log(`\nAvg score: ${report.summary.avgScore}/10`);
  console.log(`Live compared: ${report.summary.liveReachable}/100`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Weakest: ${WEAKEST_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
