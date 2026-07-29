/**
 * Batch-generate 30 industry website blueprints and score content quality.
 * Run: npx tsx scripts/audit-industry-website-quality.ts
 *
 * Uses the real deterministic pipeline (skipLlm) but stops before Blueprint
 * Executor persistence — avoids billing site caps while auditing template quality.
 */

import { writeFileSync } from "node:fs";
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
import type { AiGeneratedSection } from "../lib/website/ai/types";

const INDUSTRIES: Array<{ id: string; prompt: string }> = [
  {
    id: "Jewellery",
    prompt:
      "A luxury jewellery boutique in Mumbai specializing in bridal gold and diamond sets for Indian weddings.",
  },
  {
    id: "Hospital",
    prompt:
      "A multi-specialty hospital in Bangalore offering cardiology, orthopedics, and emergency care for families.",
  },
  {
    id: "Restaurant",
    prompt:
      "A fine-dining restaurant in Delhi serving contemporary Indian cuisine with tasting menus and wine pairings.",
  },
  {
    id: "Law Firm",
    prompt:
      "A corporate law firm in Mumbai specializing in mergers, intellectual property, and commercial litigation.",
  },
  {
    id: "Interior Design",
    prompt:
      "An interior design studio in Pune creating residential and boutique commercial spaces with custom furniture.",
  },
  {
    id: "Travel Agency",
    prompt:
      "A travel agency in Kochi specializing in curated Kerala backwater holidays and international honeymoon packages.",
  },
  {
    id: "Gym",
    prompt:
      "A modern fitness gym in Hyderabad with strength training, HIIT classes, and personal coaching memberships.",
  },
  {
    id: "School",
    prompt:
      "A progressive CBSE school in Chennai focused on inquiry-based learning, arts, and strong parent partnership.",
  },
  {
    id: "Meditation Centre",
    prompt:
      "A meditation centre in Rishikesh offering guided mindfulness programs, silent retreats, and breathwork sessions.",
  },
  {
    id: "Photography",
    prompt:
      "A wedding and lifestyle photography studio in Jaipur capturing destination weddings and brand campaigns.",
  },
  {
    id: "Hotel",
    prompt:
      "A boutique heritage hotel in Udaipur with lake-view suites, spa experiences, and destination wedding venues.",
  },
  {
    id: "Dental Clinic",
    prompt:
      "A family dental clinic in Ahmedabad offering cosmetic dentistry, implants, and pediatric oral care.",
  },
  {
    id: "Fashion Brand",
    prompt:
      "A contemporary Indian fashion brand selling ready-to-wear ethnic wear and festive collections online.",
  },
  {
    id: "Bakery",
    prompt:
      "An artisan bakery in Goa known for sourdough, seasonal pastries, and custom celebration cakes.",
  },
  {
    id: "Real Estate",
    prompt:
      "A real estate agency in Gurugram helping buyers find premium apartments and commercial office spaces.",
  },
  {
    id: "SaaS",
    prompt:
      "A B2B SaaS platform that helps mid-market companies automate customer onboarding and retention workflows.",
  },
  {
    id: "NGO",
    prompt:
      "A nonprofit NGO supporting rural girls' education through scholarships, mentorship, and community learning centres.",
  },
  {
    id: "Event Management",
    prompt:
      "An event management company producing corporate conferences, product launches, and luxury weddings across India.",
  },
  {
    id: "Beauty Salon",
    prompt:
      "A beauty salon in Chandigarh offering bridal makeup, hair styling, skincare treatments, and spa packages.",
  },
  {
    id: "Electronics Store",
    prompt:
      "An electronics retail store in Noida selling smartphones, laptops, home appliances, and offering same-day delivery.",
  },
  {
    id: "Furniture Store",
    prompt:
      "A furniture showroom in Indore specializing in modular kitchens, living room sets, and custom woodwork.",
  },
  {
    id: "Accounting Firm",
    prompt:
      "A chartered accounting firm in Kolkata providing tax filing, GST compliance, audits, and CFO advisory for SMEs.",
  },
  {
    id: "Car Dealership",
    prompt:
      "An authorized car dealership in Coimbatore offering new vehicles, test drives, financing, and certified service.",
  },
  {
    id: "Pet Clinic",
    prompt:
      "A veterinary pet clinic in Thiruvananthapuram offering vaccinations, surgery, dental care, and wellness checkups.",
  },
  {
    id: "Yoga Studio",
    prompt:
      "A yoga studio in Mysore teaching Hatha, Vinyasa, and prenatal classes with teacher trainings and workshops.",
  },
  {
    id: "Coaching Centre",
    prompt:
      "A competitive exam coaching centre in Kota preparing students for JEE and NEET with mentors and mock tests.",
  },
  {
    id: "Construction Company",
    prompt:
      "A construction company in Nagpur building residential apartments and commercial projects with on-time delivery.",
  },
  {
    id: "Cafe",
    prompt:
      "A neighbourhood specialty cafe in Bengaluru serving single-origin coffee, brunch plates, and weekend live music.",
  },
  {
    id: "Digital Agency",
    prompt:
      "A digital marketing agency in Mumbai offering brand strategy, performance ads, SEO, and conversion-focused websites.",
  },
  {
    id: "Home Decor",
    prompt:
      "A home decor boutique in Surat selling curated lighting, textiles, wall art, and styling consultations.",
  },
];

const GENERIC_PHRASES = [
  "what we offer",
  "why choose",
  "ready to work with",
  "get in touch",
  "learn more",
  "built for",
  "explore collections",
  "clear solutions that move work forward",
  "get .* built around your goals",
  "website visitors",
  "customers who value quality",
  "without the noise",
  "core part of what",
  "reach out to learn how",
  "a core part of what",
  "featured by",
  "item 1",
  "highlight",
  "product catalog",
  "shoppers looking for curated products",
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
  /^get product catalog/i,
  /^care that puts patients first every visit$/i,
  /^taste menus made for memorable evenings$/i,
];

type SectionSnap = {
  type: string;
  heading: string;
  subheading: string;
  body: string;
  cta: string;
  itemTitles: string[];
};

type AuditResult = {
  industry: string;
  score: number;
  empty: boolean;
  hasHero: boolean;
  hasCta: boolean;
  hasContentSection: boolean;
  layoutIssues: string[];
  poorHeadlines: string[];
  duplicateSections: string[];
  genericContent: string[];
  suggestions: string[];
  heroHeadline: string;
  heroCta: string;
  heroStyle: string;
  sectionTypes: string[];
  pageCount: number;
  homeSectionCount: number;
  industryLabel: string;
  category: string;
};

function textOf(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
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

function isBlankContent(snap: SectionSnap): boolean {
  if (snap.type === "spacer") return true;
  if (snap.type === "gallery" || snap.type === "image") return true;
  return !(
    snap.heading ||
    snap.subheading ||
    snap.body ||
    snap.cta ||
    snap.itemTitles.length
  );
}

function auditHome(sections: SectionSnap[]): Omit<
  AuditResult,
  "industry" | "pageCount" | "industryLabel" | "category" | "heroStyle"
> {
  const contentSections = sections.filter((s) => s.type !== "spacer");
  const heroes = contentSections.filter((s) => s.type === "hero");
  const ctas = contentSections.filter((s) => s.type === "cta");
  const otherContent = contentSections.filter(
    (s) =>
      s.type !== "hero" &&
      s.type !== "cta" &&
      s.type !== "spacer" &&
      !isBlankContent(s),
  );

  const hero = heroes[0];
  const empty =
    contentSections.length === 0 ||
    contentSections.every(isBlankContent) ||
    (!hero?.heading && !hero?.cta);

  const layoutIssues: string[] = [];
  if (heroes.length === 0) layoutIssues.push("Missing hero section");
  if (heroes.length > 1) layoutIssues.push(`Multiple heroes (${heroes.length})`);
  if (contentSections.length < 3) {
    layoutIssues.push(`Sparse home layout (${contentSections.length} sections)`);
  }

  for (let i = 1; i < contentSections.length; i++) {
    const prev = contentSections[i - 1]!;
    const curr = contentSections[i]!;
    if (prev.type === curr.type && prev.type !== "spacer") {
      layoutIssues.push(`Adjacent duplicate ${curr.type} sections`);
    }
  }

  const poorHeadlines: string[] = [];
  for (const section of contentSections) {
    const heading = section.heading;
    if (!heading) {
      if (
        section.type === "hero" ||
        section.type === "cta" ||
        section.type === "features"
      ) {
        poorHeadlines.push(`${section.type}: empty heading`);
      }
      continue;
    }
    if (heading.split(/\s+/).length > 14) {
      poorHeadlines.push(`${section.type}: too long ("${heading}")`);
    }
    for (const pattern of WEAK_HEADLINE_PATTERNS) {
      if (pattern.test(heading)) {
        poorHeadlines.push(`${section.type}: weak pattern ("${heading}")`);
        break;
      }
    }
  }

  const duplicateSections: string[] = [];
  const typeCounts = new Map<string, number>();
  for (const section of contentSections) {
    typeCounts.set(section.type, (typeCounts.get(section.type) || 0) + 1);
  }
  for (const [type, count] of typeCounts) {
    if (type === "spacer") continue;
    if (count > 1) duplicateSections.push(`${type} x${count}`);
  }

  const featureTitles = contentSections
    .filter((s) => s.type === "features")
    .flatMap((s) => s.itemTitles.map((t) => t.toLowerCase()));
  const titleSeen = new Set<string>();
  for (const title of featureTitles) {
    if (titleSeen.has(title)) {
      duplicateSections.push(`duplicate feature title "${title}"`);
    }
    titleSeen.add(title);
  }

  const genericContent: string[] = [];
  const blob = contentSections
    .map(
      (s) =>
        `${s.heading} ${s.subheading} ${s.body} ${s.cta} ${s.itemTitles.join(" ")}`,
    )
    .join(" ")
    .toLowerCase();
  for (const phrase of GENERIC_PHRASES) {
    const re = new RegExp(phrase, "i");
    if (re.test(blob)) genericContent.push(phrase);
  }

  const suggestions: string[] = [];
  if (empty) suggestions.push("Ensure hero injection always fills heading + CTA");
  if (!ctas.length && !hero?.cta) {
    suggestions.push("Add a clear primary CTA on home");
  }
  if (genericContent.length >= 3) {
    suggestions.push(
      "Replace category-generic copy with industry-specific phrases",
    );
  }
  if (poorHeadlines.length) {
    suggestions.push(
      "Tighten hero/feature headlines to benefit-led industry language",
    );
  }
  if (duplicateSections.some((d) => d.startsWith("features"))) {
    suggestions.push(
      "Diversify feature section roles (offer vs trust vs process)",
    );
  }
  if (
    /explore collections|get in touch/i.test(hero?.cta || "") &&
    !/jewel|fashion|furniture|decor|retail|store|shop/i.test(blob)
  ) {
    suggestions.push(`Primary CTA "${hero?.cta}" mismatches industry`);
  }

  let score = 100;
  if (empty) score -= 40;
  if (!heroes.length || !hero?.heading) score -= 20;
  if (!ctas.length && !hero?.cta) score -= 15;
  if (!otherContent.length) score -= 15;
  score -= Math.min(20, layoutIssues.length * 5);
  score -= Math.min(15, poorHeadlines.length * 5);
  score -= Math.min(15, duplicateSections.length * 4);
  score -= Math.min(20, genericContent.length * 3);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    empty,
    hasHero: heroes.length > 0 && Boolean(hero?.heading),
    hasCta: ctas.length > 0 || Boolean(hero?.cta),
    hasContentSection: otherContent.length > 0,
    layoutIssues: [...new Set(layoutIssues)],
    poorHeadlines: [...new Set(poorHeadlines)],
    duplicateSections: [...new Set(duplicateSections)],
    genericContent: [...new Set(genericContent)],
    suggestions: [...new Set(suggestions)],
    heroHeadline: hero?.heading || "",
    heroCta: hero?.cta || ctas[0]?.cta || "",
    sectionTypes: contentSections.map((s) => s.type),
    homeSectionCount: contentSections.length,
  };
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
    blueprint: heroApply.blueprint,
    profile,
    businessPlan: plannerResult.plan,
    heroStyle: generationRun.hero?.style || "",
  };
}

async function main() {
  const results: AuditResult[] = [];
  console.log(
    `Auditing ${INDUSTRIES.length} industries (blueprint-only, skipLlm)…\n`,
  );

  for (const industry of INDUSTRIES) {
    process.stdout.write(`→ ${industry.id}… `);
    try {
      const generated = await generateBlueprint(industry.prompt);
      const home = generated.blueprint.pages.find((p) => p.pageType === "home");
      const homeSections = (home?.sections || []).map(snapSection);
      const audit = auditHome(homeSections);
      results.push({
        industry: industry.id,
        pageCount: generated.blueprint.pages.length,
        industryLabel: generated.profile.industry || "",
        category: generated.profile.category || "",
        heroStyle: generated.heroStyle,
        ...audit,
      });
      console.log(
        `score=${audit.score} [${generated.profile.category}/${generated.heroStyle}] "${audit.heroHeadline.slice(0, 44)}"`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAILED: ${message}`);
      results.push({
        industry: industry.id,
        score: 0,
        empty: true,
        hasHero: false,
        hasCta: false,
        hasContentSection: false,
        layoutIssues: [`generation failed: ${message}`],
        poorHeadlines: [],
        duplicateSections: [],
        genericContent: [],
        suggestions: ["Fix generation failure"],
        heroHeadline: "",
        heroCta: "",
        heroStyle: "",
        sectionTypes: [],
        pageCount: 0,
        homeSectionCount: 0,
        industryLabel: "",
        category: "",
      });
    }
  }

  results.sort((a, b) => a.score - b.score);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "blueprint-skipLlm",
    summary: {
      count: results.length,
      avgScore:
        Math.round(
          (results.reduce((sum, r) => sum + r.score, 0) / results.length) * 10,
        ) / 10,
      emptyCount: results.filter((r) => r.empty).length,
      missingHero: results.filter((r) => !r.hasHero).length,
      missingCta: results.filter((r) => !r.hasCta).length,
      missingContent: results.filter((r) => !r.hasContentSection).length,
    },
    worstToBest: results,
  };

  const outPath = "scripts/audit-industry-website-quality.report.json";
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n========== QUALITY RANKING (worst → best) ==========");
  for (const r of results) {
    console.log(
      `${String(r.score).padStart(3)}  ${r.industry.padEnd(22)}  [${(r.category || "?").padEnd(12)} ${(r.heroStyle || "?").padEnd(11)}]  ${r.heroHeadline.slice(0, 52)}`,
    );
  }
  console.log(`\nAvg score: ${report.summary.avgScore}`);
  console.log(`Report: ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
