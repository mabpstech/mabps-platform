/**
 * Deterministic Hero generator fallback (AI Pipeline Phase 3).
 * Maps BusinessPlan signals into HeroSectionContent — no LLM, no markup.
 */

import type { BusinessPlan } from "@/lib/website/ai/business-planner/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";
import type { WebsitePlan } from "@/lib/website/ai/website-planner/types";
import {
  HERO_HEADLINE_MAX_WORDS,
  HERO_SUBHEADLINE_MAX_WORDS,
} from "@/lib/website/ai/generators/hero/schema";
import type {
  HeroLayout,
  HeroSectionContent,
  HeroStyle,
} from "@/lib/website/ai/generators/hero/types";
import { countWords } from "@/lib/website/ai/generators/hero/validate";

/** Labels that come from website feature defaults — never use as hero offer nouns. */
const META_SERVICE_RE =
  /^(product catalog|collections|shipping info|returns policy|services list|credentials|appointment booking|faq|about|contact form|clear navigation|service packages|quote request|before\/after gallery|menu|reservations|location hours|gallery|online booking|ecommerce checkout|whatsapp cta|map \/ location|blog|multilingual)$/i;

function haystack(plan: BusinessPlan): string {
  return [
    plan.businessType,
    plan.industry,
    plan.targetAudience,
    plan.tone,
    plan.style,
    ...plan.goals,
    ...plan.services,
  ]
    .join(" ")
    .toLowerCase();
}

function clampWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return words.slice(0, maxWords).join(" ");
}

function shortPhrase(value: string, maxWords: number): string {
  return clampWords(value.trim() || "", maxWords);
}

function pickStyle(plan: BusinessPlan): HeroStyle {
  const text = haystack(plan);

  if (
    /\bhospital\b|clinic|doctor|medical|healthcare|dentist|patient|veterinary|pet clinic|vet\b|dental clinic|cosmetic dentistry/i.test(
      text,
    )
  ) {
    return "healthcare";
  }
  if (
    /restaurant|cafe|café|bistro|dining|bakery|bar\b|food/i.test(text) ||
    plan.businessType === "restaurant"
  ) {
    return "restaurant";
  }
  if (
    /meditation|mindful|yoga|retreat|spiritual|ashram|wellness/i.test(text)
  ) {
    return "spiritual";
  }
  if (
    /luxury|premium|elegant|bridal|jewell?ery|gold|diamond|wedding|hotel|heritage|boutique hotel/i.test(
      text,
    ) ||
    /luxury|elegant|premium/i.test(plan.tone) ||
    /luxury|elegant|premium/i.test(plan.style)
  ) {
    return "luxury";
  }
  if (/minimal|clean|simple|sparse/i.test(text)) {
    return "minimal";
  }
  if (
    /corporate|professional|b2b|enterprise|lawyer|consultant|accountant|saas|agency|construction|coaching|real estate/i.test(
      text,
    ) ||
    plan.businessType === "professional_practice" ||
    plan.businessType === "saas"
  ) {
    return "corporate";
  }
  if (/modern|contemporary|tech|digital|gym|fitness|fashion/i.test(text)) {
    return "modern";
  }

  return "modern";
}

function pickLayout(style: HeroStyle): HeroLayout {
  switch (style) {
    case "restaurant":
      return "fullscreen";
    case "minimal":
    case "spiritual":
      return "center";
    case "modern":
      return "split-right";
    case "luxury":
    case "corporate":
    case "healthcare":
    default:
      return "split-left";
  }
}

function industryPhrase(plan: BusinessPlan): string {
  const industry = plan.industry.trim();
  if (industry && !META_SERVICE_RE.test(industry)) {
    return shortPhrase(industry, 4);
  }
  const type = plan.businessType.trim();
  if (type && type !== "other") return shortPhrase(type.replace(/_/g, " "), 3);
  return "business";
}

function primaryService(plan: BusinessPlan): string {
  const real = plan.services.find(
    (service) => service.trim() && !META_SERVICE_RE.test(service.trim()),
  );
  if (real) return shortPhrase(real, 4);
  return industryPhrase(plan);
}

function audiencePhrase(plan: BusinessPlan): string {
  const audience = plan.targetAudience.trim();
  if (
    audience &&
    !/website visitors|local customers researching this business/i.test(
      audience,
    )
  ) {
    return shortPhrase(audience, 6);
  }
  return shortPhrase(`people seeking ${industryPhrase(plan)}`, 6);
}

type IndustryVoice = {
  match: RegExp;
  headline: (service: string, industry: string) => string;
  subheadline: (audience: string, industry: string, service: string) => string;
  primaryCta: string;
  secondaryCta: string;
  imagePrompt: (industry: string, service: string) => string;
};

const INDUSTRY_VOICES: IndustryVoice[] = [
  {
    match: /jewell?ery|jewelry/,
    headline: (service) =>
      /bridal/i.test(service)
        ? "Bridal pieces made for lasting moments"
        : `Fine ${service} made for lasting moments`,
    subheadline: (audience, industry) =>
      `Crafted for ${audience}, our ${industry} pairs hallmarked pieces with private showroom guidance.`,
    primaryCta: "Book a private viewing",
    secondaryCta: "View bridal sets",
    imagePrompt: (industry, service) =>
      `Luxury ${industry} showroom featuring ${service}, elegant displays, soft cinematic lighting`,
  },
  {
    match: /veterinary|pet clinic/,
    headline: () => "Compassionate care for the pets you love",
    subheadline: (audience) =>
      `Vaccinations, surgery, and wellness visits designed for ${audience} who want clear, kind guidance.`,
    primaryCta: "Book a pet visit",
    secondaryCta: "See our services",
    imagePrompt: () =>
      `Warm veterinary clinic reception with calm lighting, clean exam rooms, pet-friendly atmosphere`,
  },
  {
    match: /dental clinic|dentist|cosmetic dentistry|oral care/,
    headline: () => "Gentle dental care for confident smiles",
    subheadline: (audience) =>
      `From checkups to cosmetic care, we help ${audience} feel informed and comfortable every visit.`,
    primaryCta: "Book a dental visit",
    secondaryCta: "View treatments",
    imagePrompt: () =>
      `Bright modern dental clinic, welcoming treatment room, soft daylight, clean clinical finishes`,
  },
  {
    match: /\bhospital\b|healthcare|multi-specialty/,
    headline: () => "Specialist care ready when families need it",
    subheadline: (audience, industry) =>
      `${industry} teams support ${audience} with clear guidance, modern facilities, and calm appointments.`,
    primaryCta: "Book an appointment",
    secondaryCta: "Meet our doctors",
    imagePrompt: (industry) =>
      `Calm modern ${industry} interior, welcoming reception, soft natural light, reassuring atmosphere`,
  },
  {
    match: /bakery/,
    headline: () => "Fresh bakes made for everyday celebrations",
    subheadline: (audience) =>
      `Sourdough, seasonal pastries, and custom cakes for ${audience} who care how bread should taste.`,
    primaryCta: "Order fresh bakes",
    secondaryCta: "See today's bakes",
    imagePrompt: () =>
      `Artisan bakery counter with bread loaves and pastries, warm flour-dusted atmosphere`,
  },
  {
    match: /\bcafe\b|coffee/,
    headline: () => "Coffee and brunch worth making a ritual",
    subheadline: (audience) =>
      `Single-origin cups and unhurried plates for ${audience} who want a neighbourhood table that feels theirs.`,
    primaryCta: "Visit the cafe",
    secondaryCta: "See the menu",
    imagePrompt: () =>
      `Specialty cafe interior with espresso bar, pastry case, warm daylight, lived-in textures`,
  },
  {
    match: /\brestaurant\b|fine dining/,
    headline: () => "Menus crafted for evenings worth remembering",
    subheadline: (audience) =>
      `Seasonal plates and attentive hospitality welcome ${audience} back for flavours that linger.`,
    primaryCta: "Reserve a table",
    secondaryCta: "See the menu",
    imagePrompt: (industry, service) =>
      `Inviting ${industry} dining room with plated ${service}, warm ambient lighting, editorial food photography`,
  },
  {
    match: /legal|law firm/,
    headline: () => "Legal counsel that keeps decisions clear",
    subheadline: (audience) =>
      `Practical guidance for ${audience} navigating commercial, IP, and dispute matters with confidence.`,
    primaryCta: "Request a consultation",
    secondaryCta: "View practice areas",
    imagePrompt: () =>
      `Polished law firm office with confident professionals, clean architecture, balanced daylight`,
  },
  {
    match: /interior design/,
    headline: () => "Spaces planned with intention and craft",
    subheadline: (audience) =>
      `Residential and boutique projects for ${audience} who want materials, light, and layout working together.`,
    primaryCta: "Book a design consult",
    secondaryCta: "View projects",
    imagePrompt: () =>
      `Styled residential interior with custom furniture, natural materials, soft architectural light`,
  },
  {
    match: /travel agency|tour operator|honeymoon|holiday package|backwater/,
    headline: () => "Journeys planned with local intelligence",
    subheadline: (audience) =>
      `Curated itineraries for ${audience} who want thoughtful pacing, trusted partners, and real local texture.`,
    primaryCta: "Plan your trip",
    secondaryCta: "Browse packages",
    imagePrompt: () =>
      `Travel planning desk with maps and destination photography, warm daylight, aspirational mood`,
  },
  {
    match: /fitness|\bgym\b/,
    headline: () => "Training that builds lasting strength",
    subheadline: (audience) =>
      `Coaching, classes, and memberships for ${audience} ready to train with purpose and consistency.`,
    primaryCta: "Start a membership",
    secondaryCta: "See class schedule",
    imagePrompt: () =>
      `Modern gym floor with strength equipment, energetic lighting, focused athletes training`,
  },
  {
    match: /coaching|jee|neet/,
    headline: () => "Exam prep with mentors who stay close",
    subheadline: (audience) =>
      `Structured batches and mock tests for ${audience} aiming for competitive clarity, not guesswork.`,
    primaryCta: "Talk to a counsellor",
    secondaryCta: "See batch details",
    imagePrompt: () =>
      `Coaching classroom with focused students, mentor at whiteboard, bright studious atmosphere`,
  },
  {
    match: /\bschool\b|cbse/,
    headline: () => "Learning that grows curious, capable students",
    subheadline: (audience) =>
      `A school community for ${audience} who want strong academics, arts, and genuine parent partnership.`,
    primaryCta: "Enquire about admissions",
    secondaryCta: "Explore student life",
    imagePrompt: () =>
      `Bright school campus with students collaborating, natural light, welcoming learning spaces`,
  },
  {
    match: /meditation/,
    headline: () => "Practices that restore everyday calm",
    subheadline: (audience) =>
      `Guided programs and retreats help ${audience} slow down, breathe deeper, and rebuild presence.`,
    primaryCta: "Join a session",
    secondaryCta: "View programs",
    imagePrompt: () =>
      `Serene meditation hall with soft daylight, natural materials, quiet contemplative seating`,
  },
  {
    match: /photography/,
    headline: () => "Images that keep the feeling intact",
    subheadline: (audience) =>
      `Wedding and lifestyle storytelling for ${audience} who want photographs with atmosphere and honesty.`,
    primaryCta: "Check availability",
    secondaryCta: "View portfolio",
    imagePrompt: () =>
      `Editorial wedding photography scene with natural light, candid emotion, refined composition`,
  },
  {
    match: /hotel|hospitality/,
    headline: () => "Stays shaped by place and quiet luxury",
    subheadline: (audience) =>
      `Suites, spa moments, and gatherings for ${audience} seeking a stay that feels personal, not generic.`,
    primaryCta: "Check availability",
    secondaryCta: "Explore the hotel",
    imagePrompt: () =>
      `Boutique heritage hotel suite with lake views, soft textiles, warm evening light`,
  },
  {
    match: /fashion/,
    headline: () => "Ready-to-wear made for festive days",
    subheadline: (audience) =>
      `Ethnic and contemporary collections for ${audience} who want pieces that feel current and wearable.`,
    primaryCta: "Shop the collection",
    secondaryCta: "See new arrivals",
    imagePrompt: () =>
      `Fashion brand lookbook scene with festive ethnic wear, clean styling, soft studio light`,
  },
  {
    match: /real estate|property/,
    headline: () => "Homes and offices matched with clarity",
    subheadline: (audience) =>
      `Guided search and site visits for ${audience} comparing premium apartments and commercial spaces.`,
    primaryCta: "Schedule a site visit",
    secondaryCta: "Browse listings",
    imagePrompt: () =>
      `Premium apartment interior ready for viewing, bright daylight, refined residential detailing`,
  },
  {
    match: /saas|software/,
    headline: () => "Onboarding workflows teams can trust",
    subheadline: (audience) =>
      `A platform for ${audience} automating customer journeys without adding operational noise.`,
    primaryCta: "Request a demo",
    secondaryCta: "See how it works",
    imagePrompt: () =>
      `Modern SaaS product UI on laptop in a clean office, crisp lighting, confident tech aesthetic`,
  },
  {
    match: /nonprofit|ngo/,
    headline: () => "Education that widens what girls can claim",
    subheadline: (audience) =>
      `Programs, mentorship, and community learning for ${audience} invested in lasting rural education impact.`,
    primaryCta: "Support the mission",
    secondaryCta: "See our impact",
    imagePrompt: () =>
      `Community learning centre with students studying, warm natural light, hopeful documentary mood`,
  },
  {
    match: /event management|conferences|product launches/,
    headline: () => "Events produced with polish and calm control",
    subheadline: (audience) =>
      `Conferences, launches, and weddings for ${audience} who need planning, production, and guest experience handled.`,
    primaryCta: "Plan your event",
    secondaryCta: "View recent events",
    imagePrompt: () =>
      `Luxury event venue setup with refined lighting, floral details, polished guest atmosphere`,
  },
  {
    match: /salon|beauty/,
    headline: () => "Beauty rituals for bridal and everyday glow",
    subheadline: (audience) =>
      `Makeup, hair, and skincare for ${audience} preparing for celebrations or a quiet reset.`,
    primaryCta: "Book a salon visit",
    secondaryCta: "View packages",
    imagePrompt: () =>
      `Beauty salon styling station with soft glam lighting, clean finishes, calm luxury mood`,
  },
  {
    match: /electronics/,
    headline: () => "Devices chosen with honest guidance",
    subheadline: (audience) =>
      `Smartphones, laptops, and appliances for ${audience} who want demos, clear comparisons, and fast delivery.`,
    primaryCta: "Browse products",
    secondaryCta: "See offers",
    imagePrompt: () =>
      `Electronics retail showroom with phones and laptops on display, bright clean lighting`,
  },
  {
    match: /furniture/,
    headline: () => "Furniture built around how you live",
    subheadline: (audience) =>
      `Modular kitchens and living sets for ${audience} planning rooms that feel finished and useful.`,
    primaryCta: "Visit the showroom",
    secondaryCta: "Browse collections",
    imagePrompt: () =>
      `Furniture showroom with modular kitchen and living room set, warm wood tones, natural light`,
  },
  {
    match: /accounting/,
    headline: () => "Accounts, tax, and advice without the fog",
    subheadline: (audience) =>
      `Compliance and CFO support for ${audience} who need filings handled and decisions explained plainly.`,
    primaryCta: "Talk to an advisor",
    secondaryCta: "See services",
    imagePrompt: () =>
      `Professional accounting office with advisors reviewing documents, clean daylight, calm focus`,
  },
  {
    match: /automotive|dealership|car /,
    headline: () => "Cars, financing, and service in one place",
    subheadline: (audience) =>
      `Test drives and ownership support for ${audience} comparing models with clear next steps.`,
    primaryCta: "Book a test drive",
    secondaryCta: "View inventory",
    imagePrompt: () =>
      `Modern car dealership showroom with polished vehicles, bright lighting, welcoming reception`,
  },
  {
    match: /yoga/,
    headline: () => "Practice that strengthens body and breath",
    subheadline: (audience) =>
      `Classes and trainings for ${audience} building a steady yoga rhythm from beginner to advanced.`,
    primaryCta: "Book a class",
    secondaryCta: "View schedule",
    imagePrompt: () =>
      `Bright yoga studio with mats aligned, soft daylight, calm wooden floors, peaceful mood`,
  },
  {
    match: /construction/,
    headline: () => "Builds delivered with visible progress",
    subheadline: (audience) =>
      `Residential and commercial projects for ${audience} who want quality materials and on-time milestones.`,
    primaryCta: "Request a project quote",
    secondaryCta: "View projects",
    imagePrompt: () =>
      `Modern residential construction site with clean progress, safety gear, daylight documentary feel`,
  },
  {
    match: /digital agency|marketing agency|\bseo\b/,
    headline: () => "Growth work that respects the brand",
    subheadline: (audience) =>
      `Strategy, ads, SEO, and websites for ${audience} who want channels working toward conversion, not vanity.`,
    primaryCta: "Book a strategy call",
    secondaryCta: "See case studies",
    imagePrompt: () =>
      `Digital agency studio with creative team reviewing campaigns on screens, modern workspace`,
  },
  {
    match: /home decor|decor/,
    headline: () => "Decor chosen to finish a room, not fill it",
    subheadline: (audience) =>
      `Lighting, textiles, and art for ${audience} styling homes with restraint and warmth.`,
    primaryCta: "Explore decor",
    secondaryCta: "Book a styling chat",
    imagePrompt: () =>
      `Home decor boutique with curated lighting and textiles, soft daylight, inviting vignettes`,
  },
];

function findVoice(plan: BusinessPlan): IndustryVoice | null {
  const text = haystack(plan);
  return INDUSTRY_VOICES.find((voice) => voice.match.test(text)) || null;
}

function buildHeadline(plan: BusinessPlan, style: HeroStyle): string {
  const service = primaryService(plan);
  const industry = industryPhrase(plan);
  const voice = findVoice(plan);
  if (voice) {
    return clampWords(voice.headline(service, industry), HERO_HEADLINE_MAX_WORDS);
  }

  let headline: string;
  switch (style) {
    case "luxury":
      headline = `Discover ${service} crafted for lasting moments`;
      break;
    case "restaurant":
      headline = "Taste menus made for memorable evenings";
      break;
    case "healthcare":
      headline = "Care that puts patients first every visit";
      break;
    case "spiritual":
      headline = "Find calm practices that restore balance";
      break;
    case "corporate":
      headline = `Expert ${industry} guidance that moves decisions forward`;
      break;
    case "minimal":
      headline = `Simple ${industry} with lasting clarity`;
      break;
    case "modern":
    default:
      headline = `${industry} built around what ${shortPhrase(plan.targetAudience || "your customers", 3)} need`;
      break;
  }
  return clampWords(headline, HERO_HEADLINE_MAX_WORDS);
}

function buildSubheadline(plan: BusinessPlan, style: HeroStyle): string {
  const audience = audiencePhrase(plan);
  const industry = industryPhrase(plan);
  const service = primaryService(plan);
  const voice = findVoice(plan);
  if (voice) {
    return clampWords(
      voice.subheadline(audience, industry, service),
      HERO_SUBHEADLINE_MAX_WORDS,
    );
  }

  let subheadline: string;
  switch (style) {
    case "luxury":
      subheadline = `Designed for ${audience}, our ${industry} blends craftsmanship with personal showroom guidance.`;
      break;
    case "restaurant":
      subheadline = `Seasonal plates and warm hospitality welcome ${audience} with flavours worth returning for.`;
      break;
    case "healthcare":
      subheadline = `Trusted ${industry} support for ${audience}, delivered with clarity and modern clinical care.`;
      break;
    case "spiritual":
      subheadline = `Guided experiences help ${audience} slow down, breathe deeper, and rebuild everyday presence.`;
      break;
    case "corporate":
      subheadline = `We help ${audience} cut complexity and reach outcomes with practical, focused expertise.`;
      break;
    case "minimal":
      subheadline = `Focused ${industry} for ${audience} — fewer distractions, clearer choices, stronger results.`;
      break;
    case "modern":
    default:
      subheadline = `Built for ${audience}, our ${industry} approach delivers clear value and a confident next step.`;
      break;
  }
  return clampWords(subheadline, HERO_SUBHEADLINE_MAX_WORDS);
}

function buildPrimaryCta(style: HeroStyle, plan: BusinessPlan): string {
  const voice = findVoice(plan);
  if (voice) return voice.primaryCta;

  switch (style) {
    case "luxury":
      return "Book a private viewing";
    case "restaurant":
      return "Reserve a table";
    case "healthcare":
      return "Book an appointment";
    case "spiritual":
      return "Start your session";
    case "corporate":
      return "Schedule a consult";
    case "minimal":
      return "Explore the offer";
    case "modern":
    default:
      return plan.goals.some((g) => /enquir|lead|contact/i.test(g))
        ? "Get in touch"
        : "See how it works";
  }
}

function buildSecondaryCta(style: HeroStyle, plan: BusinessPlan): string | undefined {
  const voice = findVoice(plan);
  if (voice) return voice.secondaryCta;

  switch (style) {
    case "luxury":
      return "View collections";
    case "restaurant":
      return "See the menu";
    case "healthcare":
      return "Meet our team";
    case "spiritual":
      return "Learn our approach";
    case "corporate":
      return "See how we work";
    case "minimal":
      return "Learn more";
    case "modern":
    default:
      return "Learn more";
  }
}

function buildImagePrompt(plan: BusinessPlan, style: HeroStyle): string {
  const industry = industryPhrase(plan);
  const service = primaryService(plan);
  const voice = findVoice(plan);
  if (voice) return voice.imagePrompt(industry, service);

  switch (style) {
    case "luxury":
      return `Luxury ${industry} showroom featuring ${service}, elegant displays, soft cinematic lighting, refined interiors, shallow depth of field`;
    case "restaurant":
      return `Inviting ${industry} dining room with plated ${service}, warm ambient lighting, natural textures, editorial food photography`;
    case "healthcare":
      return `Calm modern ${industry} clinic interior, welcoming reception, soft natural light, clean clinical finishes, reassuring atmosphere`;
    case "spiritual":
      return `Serene ${industry} space with soft daylight, natural materials, quiet seating for ${service}, peaceful contemplative mood`;
    case "corporate":
      return `Polished ${industry} workspace with confident professionals, clean architecture, balanced daylight, understated corporate aesthetic`;
    case "minimal":
      return `Minimal ${industry} setting focused on ${service}, generous negative space, soft neutral palette, precise natural light`;
    case "modern":
    default:
      return `Contemporary ${industry} brand scene highlighting ${service}, crisp lighting, modern interiors, high-quality marketing photography`;
  }
}

/**
 * Deterministic hero content from BusinessPlan (+ task/website context).
 * Sync and unit-testable — always returns rule-compliant JSON fields.
 */
export function inferHeroSection(input: {
  businessPlan: BusinessPlan;
  websitePlan?: WebsitePlan;
  task?: GenerationTask;
}): HeroSectionContent {
  const { businessPlan } = input;
  const style = pickStyle(businessPlan);
  const layout = pickLayout(style);
  const secondaryCTA = buildSecondaryCta(style, businessPlan);

  const content: HeroSectionContent = {
    headline: buildHeadline(businessPlan, style),
    subheadline: buildSubheadline(businessPlan, style),
    primaryCTA: buildPrimaryCta(style, businessPlan),
    imagePrompt: buildImagePrompt(businessPlan, style),
    layout,
    style,
  };
  if (secondaryCTA) {
    content.secondaryCTA = secondaryCTA;
  }

  // Defensive: deterministic path must always satisfy word rules.
  if (countWords(content.headline) > HERO_HEADLINE_MAX_WORDS) {
    content.headline = clampWords(content.headline, HERO_HEADLINE_MAX_WORDS);
  }
  if (countWords(content.subheadline) > HERO_SUBHEADLINE_MAX_WORDS) {
    content.subheadline = clampWords(
      content.subheadline,
      HERO_SUBHEADLINE_MAX_WORDS,
    );
  }

  return content;
}
