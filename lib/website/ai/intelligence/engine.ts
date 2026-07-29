/**
 * Deterministic Business Intelligence engine (Sprint C2).
 * Prompt → AiBusinessProfile. No LLM, network, UI, or DB.
 */

import { clampAiTextByKey } from "@/lib/website/ai/helpers";
import type {
  AiBrandPersonality,
  AiBusinessProfile,
  AiBusinessProfileConfidence,
  AiBusinessProfileConfidenceField,
  AiBusinessType,
  AiColourDirection,
  AiContactPreference,
  AiGenerationTone,
  AiVisualStyle,
} from "@/lib/website/ai/types";
import {
  AI_BRAND_PERSONALITIES,
  AI_BUSINESS_TYPES,
  AI_COLOUR_DIRECTIONS,
  AI_CONTACT_PREFERENCES,
  AI_GENERATION_TONES,
  AI_VISUAL_STYLES,
} from "@/lib/website/ai/types";
import type { SiteCategoryId } from "@/lib/website/templates";
import { SITE_CATEGORY_IDS } from "@/lib/website/templates";
import type { PageType } from "@/lib/website/types";
import { PAGE_TYPES } from "@/lib/website/types";
import {
  AUDIENCE_PATTERNS,
  BUSINESS_TYPE_LEXICON,
  CATEGORY_DEFAULTS,
  CATEGORY_LEXICON,
  COLOUR_DIRECTION_LEXICON,
  COUNTRY_LEXICON,
  INDUSTRY_LEXICON,
  LANGUAGE_KEYWORD_LEXICON,
  PERSONALITY_LEXICON,
  REGION_LEXICON,
  TONE_LEXICON,
  VISUAL_STYLE_LEXICON,
  type LexiconEntry,
} from "@/lib/website/ai/intelligence/lexicon";
import {
  AI_CONFIDENCE_THRESHOLD,
  type AiBusinessIntelligenceInput,
} from "@/lib/website/ai/intelligence/types";

type Scored<T> = { id: T; score: number };

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim();
}

function lower(text: string): string {
  return text.toLowerCase();
}

/** Word-boundary-ish match that also allows multi-word phrases. */
function containsKeyword(haystack: string, keyword: string): boolean {
  const needle = keyword.toLowerCase().trim();
  if (!needle) return false;
  if (needle.includes(" ")) {
    return haystack.includes(needle);
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Allow a simple trailing "s" so "reservation" matches "reservations".
  return new RegExp(
    `(?:^|[^a-z0-9])${escaped}s?(?:[^a-z0-9]|$)`,
    "i",
  ).test(haystack);
}

function scoreLexicon<T extends string>(
  text: string,
  entries: LexiconEntry<T>[],
): Scored<T>[] {
  const scores = new Map<T, number>();
  for (const entry of entries) {
    let hits = 0;
    for (const keyword of entry.keywords) {
      if (containsKeyword(text, keyword)) hits += 1;
    }
    if (hits === 0) continue;
    const weight = entry.weight ?? 1;
    const score = Math.min(1, (hits / Math.max(2, entry.keywords.length * 0.25)) * weight);
    // Prefer raw hit strength: more hits → higher score, capped at 1
    const hitScore = Math.min(1, 0.35 + hits * 0.2) * weight;
    scores.set(entry.id, Math.min(1, Math.max(score, hitScore)));
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

function bestScore<T>(scored: Scored<T>[]): Scored<T> | null {
  return scored[0] ?? null;
}

function acceptScore(score: number): boolean {
  return score >= AI_CONFIDENCE_THRESHOLD;
}

function setConfidence(
  confidence: AiBusinessProfileConfidence,
  field: AiBusinessProfileConfidenceField,
  score: number,
): void {
  confidence[field] = Math.round(score * 100) / 100;
}

function extractBusinessName(prompt: string): {
  name: string | null;
  confidence: number;
} {
  const patterns: Array<{ re: RegExp; group: number; confidence: number }> = [
    {
      re: /\b(?:called|named)\s+["']?([A-Z][\w&'’.-]*(?:\s+(?:&|and)\s+[A-Z][\w&'’.-]*|\s+[A-Z][\w&'’.-]*){0,4})["']?/u,
      group: 1,
      confidence: 0.9,
    },
    {
      re: /\b([A-Z][\w&'’.-]*(?:\s+(?:&|and)\s+[A-Z][\w&'’.-]*|\s+[A-Z][\w&'’.-]*){0,4})\s+(?:is|are)\s+(?:a|an|the)\b/u,
      group: 1,
      confidence: 0.85,
    },
    {
      re: /\b(?:for|about)\s+["']?([A-Z][\w&'’.-]*(?:\s+(?:&|and)\s+[A-Z][\w&'’.-]*|\s+[A-Z][\w&'’.-]*){0,4})["']?/u,
      group: 1,
      confidence: 0.75,
    },
    {
      re: /["']([A-Za-z][\w&'’ .-]{1,40})["']/u,
      group: 1,
      confidence: 0.65,
    },
  ];

  const stop = new Set([
    "a",
    "an",
    "the",
    "my",
    "our",
    "website",
    "site",
    "business",
    "company",
    "i",
    "we",
    "need",
    "want",
    "create",
    "build",
    "make",
    "generate",
  ]);

  for (const pattern of patterns) {
    const match = prompt.match(pattern.re);
    if (!match?.[pattern.group]) continue;
    const raw = match[pattern.group].trim().replace(/\s+/g, " ");
    const words = raw.split(" ").filter(Boolean);
    if (words.length === 0) continue;
    if (words.every((w) => stop.has(w.toLowerCase()))) continue;
    if (raw.length < 2 || raw.length > 60) continue;
    return { name: raw, confidence: pattern.confidence };
  }

  return { name: null, confidence: 0.15 };
}

function detectScriptLanguage(prompt: string): {
  language: string | null;
  confidence: number;
} {
  if (/[\u0D00-\u0D7F]/.test(prompt)) return { language: "ml", confidence: 0.95 };
  if (/[\u0900-\u097F]/.test(prompt)) return { language: "hi", confidence: 0.9 };
  if (/[\u0B80-\u0BFF]/.test(prompt)) return { language: "ta", confidence: 0.95 };
  if (/[\u0C00-\u0C7F]/.test(prompt)) return { language: "te", confidence: 0.95 };
  if (/[\u0C80-\u0CFF]/.test(prompt)) return { language: "kn", confidence: 0.95 };
  if (/[\u0980-\u09FF]/.test(prompt)) return { language: "bn", confidence: 0.95 };
  if (/[\u0600-\u06FF]/.test(prompt)) return { language: "ar", confidence: 0.9 };
  if (/[\u00C0-\u017F]/.test(prompt) && /\b(el|la|los|las|le|les|des|une)\b/i.test(prompt)) {
    if (/\b(el|la|los|las|para|con)\b/i.test(prompt)) {
      return { language: "es", confidence: 0.55 };
    }
    if (/\b(le|les|des|une|pour)\b/i.test(prompt)) {
      return { language: "fr", confidence: 0.55 };
    }
  }
  return { language: null, confidence: 0 };
}

function detectLanguage(
  text: string,
  prompt: string,
): { language: string | null; confidence: number } {
  const script = detectScriptLanguage(prompt);
  if (script.language && acceptScore(script.confidence)) return script;

  for (const entry of LANGUAGE_KEYWORD_LEXICON) {
    for (const keyword of entry.keywords) {
      if (containsKeyword(text, keyword)) {
        return { language: entry.code, confidence: 0.85 };
      }
    }
  }

  // Default English only when prompt is Latin-script and non-empty
  if (/[a-z]/i.test(prompt) && !/[^\u0000-\u024F\s\d\p{P}\p{S}]/u.test(prompt)) {
    return { language: "en", confidence: 0.55 };
  }

  return { language: null, confidence: script.confidence || 0.2 };
}

function detectCountryRegion(text: string): {
  country: string | null;
  region: string | null;
  languageHint: string | null;
  countryConfidence: number;
  regionConfidence: number;
} {
  let country: string | null = null;
  let region: string | null = null;
  let languageHint: string | null = null;
  let countryConfidence = 0;
  let regionConfidence = 0;

  for (const entry of REGION_LEXICON) {
    for (const keyword of entry.keywords) {
      if (containsKeyword(text, keyword)) {
        region = entry.region;
        country = entry.country;
        regionConfidence = 0.9;
        countryConfidence = Math.max(countryConfidence, 0.8);
        break;
      }
    }
    if (region) break;
  }

  for (const entry of COUNTRY_LEXICON) {
    for (const name of entry.names) {
      if (containsKeyword(text, name)) {
        if (!country || country === entry.code) {
          country = entry.code;
          countryConfidence = Math.max(countryConfidence, 0.88);
          languageHint = entry.defaultLanguage;
          if (!region && entry.defaultRegion) {
            region = entry.defaultRegion;
            regionConfidence = Math.max(regionConfidence, 0.55);
          }
        }
        break;
      }
    }
  }

  return { country, region, languageHint, countryConfidence, regionConfidence };
}

function detectAudience(text: string): {
  audience: string | null;
  confidence: number;
} {
  for (const entry of AUDIENCE_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        return { audience: entry.label, confidence: 0.85 };
      }
    }
    let hits = 0;
    for (const keyword of entry.keywords) {
      if (containsKeyword(text, keyword)) hits += 1;
    }
    if (hits >= 1) {
      return {
        audience: entry.label,
        confidence: Math.min(0.8, 0.5 + hits * 0.15),
      };
    }
  }

  const forMatch = text.match(
    /\bfor\s+((?:[a-z][\w'-]*)(?:\s+[a-z][\w'-]*){0,3})\b/i,
  );
  if (forMatch?.[1]) {
    const candidate = forMatch[1].trim();
    const blocked = /^(a|an|the|my|our|me|us|website|site|business)\b/i;
    if (!blocked.test(candidate) && candidate.length > 2) {
      return { audience: candidate, confidence: 0.6 };
    }
  }

  return { audience: null, confidence: 0.2 };
}

function detectIndustry(text: string): {
  industry: string | null;
  category: SiteCategoryId | null;
  confidence: number;
  features: string[];
  ctaLabel: string | null;
  audience: string | null;
} {
  let best: {
    label: string;
    category: SiteCategoryId;
    hits: number;
    keywordWeight: number;
    features: string[];
    ctaLabel: string | null;
    audience: string | null;
  } | null = null;
  for (const entry of INDUSTRY_LEXICON) {
    let hits = 0;
    let keywordWeight = 0;
    for (const keyword of entry.keywords) {
      if (!containsKeyword(text, keyword)) continue;
      hits += 1;
      // Prefer longer, more specific keyword matches (e.g. "interior design" > "design").
      keywordWeight += Math.min(3, keyword.split(/\s+/).length);
    }
    if (hits === 0) continue;
    const rank = hits * 10 + keywordWeight;
    const bestRank = best ? best.hits * 10 + best.keywordWeight : -1;
    if (!best || rank > bestRank) {
      best = {
        label: entry.label,
        category: entry.category,
        hits,
        keywordWeight,
        features: entry.features ? [...entry.features] : [],
        ctaLabel: entry.ctaLabel || null,
        audience: entry.audience || null,
      };
    }
  }
  if (!best) {
    return {
      industry: null,
      category: null,
      confidence: 0.15,
      features: [],
      ctaLabel: null,
      audience: null,
    };
  }
  const confidence = Math.min(0.95, 0.45 + best.hits * 0.2 + best.keywordWeight * 0.05);
  // Hotels often mention dining — keep hospitality from collapsing into restaurant.
  if (
    /hotel|resort|hospitality|\bsuites?\b/i.test(text) &&
    best.label === "restaurant"
  ) {
    const hotel = INDUSTRY_LEXICON.find((entry) => entry.label === "hotel hospitality");
    if (hotel) {
      return {
        industry: hotel.label,
        category: hotel.category,
        confidence: Math.max(confidence, 0.7),
        features: hotel.features ? [...hotel.features] : [],
        ctaLabel: hotel.ctaLabel || null,
        audience: hotel.audience || null,
      };
    }
  }
  return {
    industry: best.label,
    category: best.category,
    confidence,
    features: best.features,
    ctaLabel: best.ctaLabel,
    audience: best.audience,
  };
}

function buildLocale(
  language: string | null,
  country: string | null,
): string {
  if (language && country) return `${language}-${country}`;
  if (language) return language;
  if (country) return `en-${country}`;
  return "en";
}

function buildDescription(input: {
  name: string | null;
  industry: string | null;
  audience: string | null;
  region: string | null;
  country: string | null;
  prompt: string;
}): { description: string; confidence: number } {
  const parts: string[] = [];
  if (input.name && input.industry) {
    parts.push(`${input.name} is a ${input.industry} business`);
  } else if (input.industry) {
    parts.push(`A ${input.industry} business`);
  } else if (input.name) {
    parts.push(`${input.name}`);
  }

  if (input.audience) {
    parts.push(
      parts.length
        ? `serving ${input.audience}`
        : `Serving ${input.audience}`,
    );
  }

  const place = input.region || input.country;
  if (place) {
    parts.push(parts.length ? `based in ${place}` : `Based in ${place}`);
  }

  if (parts.length === 0) {
    const clipped = clampAiTextByKey(input.prompt, "description");
    if (clipped.length >= 20) {
      return { description: clipped, confidence: 0.4 };
    }
    return { description: "", confidence: 0.15 };
  }

  let description = parts.join(", ");
  if (!/[.!?]$/.test(description)) description += ".";
  return {
    description: clampAiTextByKey(description, "description"),
    confidence: 0.7,
  };
}

function buildSeoKeywords(input: {
  name: string | null;
  industry: string | null;
  region: string | null;
  audience: string | null;
  seeds: string[];
}): string[] {
  const out: string[] = [];
  const push = (value: string | null | undefined) => {
    const v = value?.trim().toLowerCase();
    if (!v || out.includes(v)) return;
    out.push(v);
  };
  push(input.name);
  push(input.industry);
  push(input.region);
  push(input.audience);
  for (const seed of input.seeds) push(seed);
  if (input.industry && input.region) {
    push(`${input.industry} in ${input.region}`);
  }
  return out.slice(0, 12);
}

function buildSlogan(
  industry: string | null,
  tone: AiGenerationTone | null,
): { slogan: string | null; confidence: number } {
  if (!industry || !tone) return { slogan: null, confidence: 0.2 };
  const map: Partial<Record<AiGenerationTone, string>> = {
    luxury: `Premium ${industry}, thoughtfully crafted`,
    warm: `${industry} with a welcoming touch`,
    professional: `Trusted ${industry} expertise`,
    friendly: `Friendly ${industry} you can count on`,
    bold: `${industry} that stands out`,
    minimal: `Simple, clear ${industry}`,
    playful: `${industry} with personality`,
    spiritual: `Mindful ${industry} for modern life`,
  };
  let slogan = map[tone] ?? null;
  if (slogan) {
    slogan = slogan.charAt(0).toUpperCase() + slogan.slice(1);
  }
  return { slogan, confidence: slogan ? 0.55 : 0.2 };
}

function mergeUniquePages(
  base: PageType[],
  extra?: PageType[],
): PageType[] {
  const out: PageType[] = [];
  for (const page of [...base, ...(extra ?? [])]) {
    if (!out.includes(page)) out.push(page);
  }
  if (!out.includes("home")) out.unshift("home");
  return out;
}

function isPageType(value: string): value is PageType {
  return (PAGE_TYPES as readonly string[]).includes(value);
}

function detectExplicitPages(text: string): PageType[] {
  const found: PageType[] = [];
  const checks: Array<{ page: PageType; keywords: string[] }> = [
    { page: "home", keywords: ["home page", "homepage", "landing page"] },
    { page: "about", keywords: ["about page", "about us"] },
    { page: "contact", keywords: ["contact page", "contact us"] },
    { page: "products", keywords: ["products page", "menu page", "services page", "catalog page"] },
    { page: "collections", keywords: ["collections page"] },
    { page: "blog", keywords: ["blog", "articles", "news page"] },
  ];
  for (const check of checks) {
    if (check.keywords.some((k) => containsKeyword(text, k))) {
      if (!found.includes(check.page)) found.push(check.page);
    }
  }
  return found;
}

function detectContactPreferences(
  text: string,
  defaults: AiContactPreference[],
): { values: AiContactPreference[]; confidence: number } {
  const found: AiContactPreference[] = [];
  const map: Array<{ id: AiContactPreference; keywords: string[] }> = [
    { id: "whatsapp", keywords: ["whatsapp", "wa "] },
    { id: "phone", keywords: ["phone", "call us", "telephone", "mobile"] },
    { id: "email", keywords: ["email", "e-mail"] },
    { id: "booking", keywords: ["booking", "book online", "appointment", "appointments", "reservation", "reservations", "reserve"] },
    { id: "chat", keywords: ["live chat", "chatbot", "chat widget"] },
    { id: "form", keywords: ["contact form", "enquiry form", "inquiry form"] },
  ];
  for (const entry of map) {
    if (entry.keywords.some((k) => containsKeyword(text, k))) {
      found.push(entry.id);
    }
  }
  if (found.length > 0) {
    if (!found.includes("form")) found.push("form");
    return { values: found, confidence: 0.8 };
  }
  return { values: defaults, confidence: 0.55 };
}

function detectTrustSignals(
  text: string,
  defaults: string[],
): { values: string[]; confidence: number } {
  const extras: string[] = [];
  const map: Array<[string, string[]]> = [
    ["reviews", ["reviews", "ratings", "google reviews"]],
    ["testimonials", ["testimonials", "client stories"]],
    ["certifications", ["certified", "certification", "accredited", "licensed"]],
    ["years of experience", ["years of experience", "established", "since 19", "since 20"]],
    ["awards", ["award", "award-winning", "awarded"]],
    ["secure checkout", ["secure checkout", "ssl", "pci"]],
  ];
  for (const [label, keywords] of map) {
    if (keywords.some((k) => containsKeyword(text, k))) extras.push(label);
  }
  const values = [...new Set([...extras, ...defaults])].slice(0, 8);
  return {
    values,
    confidence: extras.length > 0 ? 0.75 : 0.55,
  };
}

function detectFeatures(
  text: string,
  defaults: string[],
): { values: string[]; confidence: number } {
  const extras: string[] = [];
  const map: Array<[string, string[]]> = [
    ["online booking", ["online booking", "book online", "appointments", "reservation", "reservations"]],
    ["ecommerce checkout", ["checkout", "cart", "payments", "online store"]],
    ["multilingual", ["multilingual", "bilingual", "two languages"]],
    ["blog", ["blog", "articles", "content marketing"]],
    ["gallery", ["gallery", "portfolio", "photos"]],
    ["menu", ["menu", "food menu"]],
    ["whatsapp CTA", ["whatsapp"]],
    ["faq", ["faq", "frequently asked"]],
    ["map / location", ["google maps", "location", "directions", "address"]],
  ];
  for (const [label, keywords] of map) {
    if (keywords.some((k) => containsKeyword(text, k))) extras.push(label);
  }
  const values = [...new Set([...extras, ...defaults])].slice(0, 10);
  return {
    values,
    confidence: extras.length > 0 ? 0.75 : 0.55,
  };
}

function pickPersonalities(
  text: string,
  defaults: AiBrandPersonality[],
): { values: AiBrandPersonality[]; confidence: number } {
  const scored = scoreLexicon(text, PERSONALITY_LEXICON);
  const accepted = scored
    .filter((s) => acceptScore(s.score))
    .slice(0, 4)
    .map((s) => s.id);
  if (accepted.length > 0) {
    return {
      values: accepted,
      confidence: scored[0]?.score ?? 0.6,
    };
  }
  return { values: defaults.slice(0, 3), confidence: 0.45 };
}

function applyOptionOverrides(
  profile: AiBusinessProfile,
  input: AiBusinessIntelligenceInput,
): AiBusinessProfile {
  const options = input.options;
  if (!options) return profile;
  const next = { ...profile, confidence: { ...profile.confidence } };

  if (options.locale?.trim()) {
    next.locale = options.locale.trim();
    const lang = next.locale.split("-")[0]?.toLowerCase() || null;
    if (lang) {
      next.language = lang;
      setConfidence(next.confidence, "language", 1);
    }
    const country = next.locale.split("-")[1]?.toUpperCase() || null;
    if (country && country.length === 2) {
      next.country = country;
      setConfidence(next.confidence, "country", 1);
    }
  }

  if (options.category) {
    next.category = options.category;
    setConfidence(next.confidence, "category", 1);
    const defaults = CATEGORY_DEFAULTS[options.category];
    if (!next.businessType || (next.confidence.businessType ?? 0) < 0.7) {
      next.businessType = defaults.businessType;
      setConfidence(next.confidence, "businessType", 0.7);
    }
  }

  if (options.tone) {
    next.tone = options.tone;
    setConfidence(next.confidence, "tone", 1);
  }

  if (options.includePageTypes?.length) {
    next.suggestedPages = mergeUniquePages(
      next.suggestedPages,
      options.includePageTypes.filter(isPageType),
    );
    setConfidence(next.confidence, "suggestedPages", 1);
  }

  return next;
}

/**
 * Infer a structured business profile from a single natural-language prompt.
 * Pure / synchronous / deterministic.
 */
export function inferBusinessProfile(
  input: AiBusinessIntelligenceInput,
): AiBusinessProfile {
  const prompt = clampAiTextByKey(normalizePrompt(input.prompt), "prompt");
  const text = lower(prompt);
  const confidence: AiBusinessProfileConfidence = {};

  // --- Name ---
  const nameHit = extractBusinessName(prompt);
  setConfidence(confidence, "name", nameHit.confidence);
  const name = acceptScore(nameHit.confidence)
    ? nameHit.name ?? "New website"
    : nameHit.name && nameHit.confidence >= 0.4
      ? nameHit.name
      : "New website";
  if (!acceptScore(nameHit.confidence) && name === "New website") {
    setConfidence(confidence, "name", Math.min(nameHit.confidence, 0.35));
  }

  // --- Industry / category ---
  const industryHit = detectIndustry(text);
  const categoryScores = scoreLexicon(text, CATEGORY_LEXICON);
  const categoryBest = bestScore(categoryScores);

  let category: SiteCategoryId | null = null;
  let categoryConfidence = 0;
  // Strong industry matches win over vague category keywords (e.g. "boutique").
  if (
    industryHit.category &&
    acceptScore(industryHit.confidence) &&
    (!categoryBest || industryHit.confidence >= (categoryBest.score ?? 0) - 0.05)
  ) {
    category = industryHit.category;
    categoryConfidence = Math.max(industryHit.confidence * 0.95, categoryBest?.score ?? 0);
  } else if (categoryBest && acceptScore(categoryBest.score)) {
    category = categoryBest.id;
    categoryConfidence = categoryBest.score;
  } else if (
    industryHit.category &&
    acceptScore(industryHit.confidence)
  ) {
    category = industryHit.category;
    categoryConfidence = industryHit.confidence * 0.9;
  } else if (categoryBest) {
    categoryConfidence = categoryBest.score;
    category = null;
  } else {
    categoryConfidence = 0.2;
  }
  setConfidence(confidence, "category", categoryConfidence);

  const industry =
    acceptScore(industryHit.confidence) ? industryHit.industry : null;
  setConfidence(confidence, "industry", industryHit.confidence);

  // --- Business type ---
  const typeScores = scoreLexicon(text, BUSINESS_TYPE_LEXICON);
  const typeBest = bestScore(typeScores);
  let businessType: AiBusinessType | null = null;
  let businessTypeConfidence = typeBest?.score ?? 0.2;
  if (typeBest && acceptScore(typeBest.score)) {
    businessType = typeBest.id;
  } else if (category) {
    businessType = CATEGORY_DEFAULTS[category].businessType;
    businessTypeConfidence = Math.max(businessTypeConfidence, 0.55);
  }
  setConfidence(confidence, "businessType", businessTypeConfidence);

  // --- Tone ---
  const toneScores = scoreLexicon(text, TONE_LEXICON);
  const toneBest = bestScore(toneScores);
  let tone: AiGenerationTone | null = null;
  let toneConfidence = toneBest?.score ?? 0.25;
  if (toneBest && acceptScore(toneBest.score)) {
    tone = toneBest.id;
  } else if (category) {
    tone = CATEGORY_DEFAULTS[category].tone;
    toneConfidence = 0.55;
  }
  setConfidence(confidence, "tone", toneConfidence);

  // --- Geo / language ---
  const geo = detectCountryRegion(text);
  const country = acceptScore(geo.countryConfidence) ? geo.country : null;
  const region = acceptScore(geo.regionConfidence) ? geo.region : null;
  setConfidence(confidence, "country", geo.countryConfidence || 0.15);
  setConfidence(confidence, "region", geo.regionConfidence || 0.15);

  const languageHit = detectLanguage(text, prompt);
  let language = acceptScore(languageHit.confidence)
    ? languageHit.language
    : null;
  let languageConfidence = languageHit.confidence;
  if (!language && geo.languageHint && country) {
    language = geo.languageHint;
    languageConfidence = Math.max(languageConfidence, 0.55);
  }
  setConfidence(confidence, "language", languageConfidence || 0.2);

  const locale = buildLocale(language, country);

  // --- Audience ---
  const audienceHit = detectAudience(text);
  let audience = acceptScore(audienceHit.confidence)
    ? audienceHit.audience
    : null;
  let audienceConfidence = audienceHit.confidence;
  if (!audience && industryHit.audience && acceptScore(industryHit.confidence)) {
    audience = industryHit.audience;
    audienceConfidence = Math.max(audienceConfidence, 0.7);
  }
  if (!audience && category) {
    audience = CATEGORY_DEFAULTS[category].audience;
    audienceConfidence = 0.5;
  }
  setConfidence(confidence, "audience", audienceConfidence);

  const defaults = category
    ? CATEGORY_DEFAULTS[category]
    : CATEGORY_DEFAULTS.other;

  // --- Personality ---
  const personalityHit = pickPersonalities(text, defaults.brandPersonality);
  const brandPersonality = acceptScore(personalityHit.confidence)
    ? personalityHit.values
    : personalityHit.confidence >= 0.4
      ? personalityHit.values
      : [];
  setConfidence(confidence, "brandPersonality", personalityHit.confidence);

  // --- Visual / colour ---
  const visualScores = scoreLexicon(text, VISUAL_STYLE_LEXICON);
  const visualBest = bestScore(visualScores);
  let visualStyle: AiVisualStyle | null = null;
  let visualConfidence = visualBest?.score ?? 0.25;
  if (visualBest && acceptScore(visualBest.score)) {
    visualStyle = visualBest.id;
  } else if (category) {
    visualStyle = defaults.visualStyle;
    visualConfidence = 0.55;
  }
  setConfidence(confidence, "visualStyle", visualConfidence);

  const colourScores = scoreLexicon(text, COLOUR_DIRECTION_LEXICON);
  const colourBest = bestScore(colourScores);
  let colourDirection: AiColourDirection | null = null;
  let colourConfidence = colourBest?.score ?? 0.25;
  if (colourBest && acceptScore(colourBest.score)) {
    colourDirection = colourBest.id;
  } else if (category) {
    colourDirection = defaults.colourDirection;
    colourConfidence = 0.55;
  }
  setConfidence(confidence, "colourDirection", colourConfidence);

  // --- CTA ---
  let primaryCta = defaults.primaryCta;
  let ctaConfidence = category ? 0.6 : 0.4;
  if (industryHit.ctaLabel && acceptScore(industryHit.confidence)) {
    primaryCta = {
      label: industryHit.ctaLabel,
      href: defaults.primaryCta.href,
    };
    ctaConfidence = Math.max(ctaConfidence, 0.75);
  }
  if (containsKeyword(text, "shop now") || containsKeyword(text, "buy now")) {
    primaryCta = { label: "Shop now", href: "/products" };
    ctaConfidence = 0.85;
  } else if (
    containsKeyword(text, "book now") ||
    containsKeyword(text, "book a") ||
    containsKeyword(text, "reserve")
  ) {
    primaryCta = { label: "Book now", href: "/contact" };
    ctaConfidence = 0.85;
  } else if (
    containsKeyword(text, "get a quote") ||
    containsKeyword(text, "request a quote")
  ) {
    primaryCta = { label: "Get a quote", href: "/contact" };
    ctaConfidence = 0.85;
  } else if (containsKeyword(text, "contact us") || containsKeyword(text, "get in touch")) {
    primaryCta = { label: "Contact us", href: "/contact" };
    ctaConfidence = 0.8;
  }
  if (!acceptScore(ctaConfidence) && !category) {
    // don't hard-guess CTA without category signal
    setConfidence(confidence, "primaryCta", ctaConfidence);
  } else {
    setConfidence(confidence, "primaryCta", ctaConfidence);
  }
  const resolvedCta = acceptScore(ctaConfidence) || category ? primaryCta : null;

  // --- Pages / features / trust / contact ---
  const explicitPages = detectExplicitPages(text);
  const suggestedPages = mergeUniquePages(defaults.pages, explicitPages);
  setConfidence(
    confidence,
    "suggestedPages",
    explicitPages.length > 0 ? 0.85 : category ? 0.6 : 0.4,
  );

  const featureDefaults =
    industryHit.features.length > 0 && acceptScore(industryHit.confidence)
      ? industryHit.features
      : defaults.features;
  const featuresHit = detectFeatures(text, featureDefaults);
  setConfidence(confidence, "suggestedFeatures", featuresHit.confidence);

  const trustHit = detectTrustSignals(text, defaults.trustSignals);
  setConfidence(confidence, "trustSignals", trustHit.confidence);

  const contactHit = detectContactPreferences(
    text,
    defaults.contactPreferences,
  );
  setConfidence(confidence, "contactPreferences", contactHit.confidence);

  // --- SEO ---
  const seoKeywords = buildSeoKeywords({
    name: name === "New website" ? null : name,
    industry,
    region,
    audience,
    seeds: defaults.seoSeed,
  });
  setConfidence(
    confidence,
    "seoKeywords",
    seoKeywords.length >= 3 ? 0.65 : 0.4,
  );

  // --- Description / slogan ---
  const descriptionHit = buildDescription({
    name: name === "New website" ? null : name,
    industry,
    audience,
    region,
    country,
    prompt,
  });
  setConfidence(confidence, "description", descriptionHit.confidence);

  const sloganHit = buildSlogan(industry, tone);
  const slogan = acceptScore(sloganHit.confidence) ? sloganHit.slogan : null;
  setConfidence(confidence, "slogan", sloganHit.confidence);

  const profile: AiBusinessProfile = {
    name: clampAiTextByKey(name, "siteName"),
    description: descriptionHit.description,
    slogan: slogan ? clampAiTextByKey(slogan, "slogan") : null,
    industry,
    locale,
    audience,
    category,
    businessType: acceptScore(businessTypeConfidence) ? businessType : businessType && businessTypeConfidence >= 0.45 ? businessType : null,
    tone: acceptScore(toneConfidence) ? tone : tone && toneConfidence >= 0.45 ? tone : null,
    brandPersonality,
    language,
    country,
    region,
    primaryCta: resolvedCta,
    suggestedPages: acceptScore(confidence.suggestedPages ?? 0)
      ? suggestedPages
      : suggestedPages.length
        ? suggestedPages
        : ["home", "about", "contact"],
    suggestedFeatures: featuresHit.values,
    trustSignals: trustHit.values,
    contactPreferences: contactHit.values,
    seoKeywords,
    visualStyle: acceptScore(visualConfidence) ? visualStyle : null,
    colourDirection: acceptScore(colourConfidence) ? colourDirection : null,
    confidence,
  };

  // If category is null but we still suggested other-defaults pages at low confidence, keep confidence honest
  if (!category && (confidence.suggestedPages ?? 0) < AI_CONFIDENCE_THRESHOLD) {
    profile.suggestedPages = ["home", "about", "contact"];
  }

  return applyOptionOverrides(profile, input);
}

/** Convenience: prompt string only. */
export function inferBusinessProfileFromPrompt(
  prompt: string,
): AiBusinessProfile {
  return inferBusinessProfile({ prompt });
}

/** Map a BI profile into the lighter generation intent fields. */
export function profileToGenerationIntentFields(
  profile: AiBusinessProfile,
  _prompt: string,
): {
  locale: string;
  category: SiteCategoryId;
  tone: AiGenerationTone;
  businessName: string | null;
  industry: string | null;
  requestedPageTypes: PageType[];
} {
  return {
    locale: profile.locale || "en",
    category: profile.category ?? "other",
    tone: profile.tone ?? "professional",
    businessName: profile.name !== "New website" ? profile.name : null,
    industry: profile.industry,
    requestedPageTypes:
      profile.suggestedPages.length > 0
        ? profile.suggestedPages
        : ["home", "about", "contact"],
  };
}

/** Runtime guards for BI enums (used by validators / providers). */
export function isAiBusinessType(value: unknown): value is AiBusinessType {
  return (
    typeof value === "string" &&
    (AI_BUSINESS_TYPES as readonly string[]).includes(value)
  );
}

export function isAiContactPreference(
  value: unknown,
): value is AiContactPreference {
  return (
    typeof value === "string" &&
    (AI_CONTACT_PREFERENCES as readonly string[]).includes(value)
  );
}

export function isAiVisualStyle(value: unknown): value is AiVisualStyle {
  return (
    typeof value === "string" &&
    (AI_VISUAL_STYLES as readonly string[]).includes(value)
  );
}

export function isAiColourDirection(
  value: unknown,
): value is AiColourDirection {
  return (
    typeof value === "string" &&
    (AI_COLOUR_DIRECTIONS as readonly string[]).includes(value)
  );
}

export function isAiBrandPersonality(
  value: unknown,
): value is AiBrandPersonality {
  return (
    typeof value === "string" &&
    (AI_BRAND_PERSONALITIES as readonly string[]).includes(value)
  );
}

export function isAiGenerationToneValue(
  value: unknown,
): value is AiGenerationTone {
  return (
    typeof value === "string" &&
    (AI_GENERATION_TONES as readonly string[]).includes(value)
  );
}

export function isSiteCategoryIdValue(
  value: unknown,
): value is SiteCategoryId {
  return (
    typeof value === "string" &&
    (SITE_CATEGORY_IDS as readonly string[]).includes(value)
  );
}
