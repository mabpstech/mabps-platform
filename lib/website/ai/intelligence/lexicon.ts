/**
 * Deterministic lexicons for the Business Intelligence engine (Sprint C2).
 * Keyword → signal maps only. No LLM / network.
 */

import type { SiteCategoryId } from "@/lib/website/templates";
import type {
  AiBrandPersonality,
  AiBusinessType,
  AiColourDirection,
  AiContactPreference,
  AiGenerationTone,
  AiVisualStyle,
} from "@/lib/website/ai/types";
import type { PageType } from "@/lib/website/types";

export type LexiconEntry<T extends string> = {
  id: T;
  keywords: string[];
  weight?: number;
};

export const CATEGORY_LEXICON: LexiconEntry<SiteCategoryId>[] = [
  {
    id: "restaurant",
    weight: 1.2,
    keywords: [
      "restaurant",
      "cafe",
      "café",
      "coffee shop",
      "bakery",
      "bistro",
      "bar",
      "pub",
      "diner",
      "catering",
      "food truck",
      "cloud kitchen",
      "menu",
      "cuisine",
      "chef",
      "dining",
      "hotel restaurant",
      "juice bar",
      "tea shop",
    ],
  },
  {
    id: "retail",
    weight: 1.1,
    keywords: [
      "shop",
      "store",
      "boutique",
      "retail",
      "ecommerce",
      "e-commerce",
      "online store",
      "marketplace",
      "fashion",
      "clothing",
      "apparel",
      "jewelry",
      "jewellery",
      "cosmetics",
      "skincare",
      "grocery",
      "supermarket",
      "bookstore",
      "furniture",
      "electronics store",
      "sell products",
      "product catalog",
    ],
  },
  {
    id: "professional",
    weight: 1.15,
    keywords: [
      "lawyer",
      "attorney",
      "law firm",
      "advocate",
      "doctor",
      "clinic",
      "dental",
      "dentist",
      "hospital",
      "medical",
      "physician",
      "accountant",
      "ca firm",
      "chartered accountant",
      "architect",
      "consultant",
      "consulting",
      "agency",
      "real estate",
      "realtor",
      "property",
      "insurance",
      "financial advisor",
      "therapy",
      "therapist",
      "physiotherapy",
      "veterinary",
      "vet clinic",
    ],
  },
  {
    id: "services",
    weight: 1,
    keywords: [
      "service",
      "services",
      "salon",
      "spa",
      "barber",
      "cleaning",
      "plumbing",
      "electrician",
      "hvac",
      "repair",
      "maintenance",
      "tutoring",
      "coaching",
      "fitness",
      "gym",
      "yoga",
      "photography",
      "photographer",
      "wedding planner",
      "event planner",
      "interior design",
      "landscaping",
      "moving company",
      "pest control",
      "car wash",
      "auto repair",
      "garage",
    ],
  },
  {
    id: "creator",
    weight: 1.05,
    keywords: [
      "creator",
      "influencer",
      "youtuber",
      "blogger",
      "podcaster",
      "artist",
      "musician",
      "portfolio",
      "personal brand",
      "content creator",
      "photographer portfolio",
      "writer",
      "author",
      "illustrator",
      "designer portfolio",
    ],
  },
];

export const INDUSTRY_LEXICON: Array<{
  label: string;
  category: SiteCategoryId;
  keywords: string[];
}> = [
  { label: "restaurant", category: "restaurant", keywords: ["restaurant", "dining"] },
  { label: "cafe", category: "restaurant", keywords: ["cafe", "café", "coffee"] },
  { label: "bakery", category: "restaurant", keywords: ["bakery", "pastry", "bread"] },
  { label: "fashion retail", category: "retail", keywords: ["fashion", "clothing", "apparel", "boutique"] },
  { label: "beauty & cosmetics", category: "retail", keywords: ["cosmetics", "skincare", "beauty products"] },
  { label: "jewelry", category: "retail", keywords: ["jewelry", "jewellery", "jeweller"] },
  { label: "grocery", category: "retail", keywords: ["grocery", "supermarket", "kirana"] },
  { label: "legal services", category: "professional", keywords: ["lawyer", "attorney", "law firm", "advocate"] },
  { label: "healthcare", category: "professional", keywords: ["doctor", "clinic", "hospital", "medical", "dental", "dentist"] },
  { label: "accounting", category: "professional", keywords: ["accountant", "chartered accountant", "ca firm", "bookkeeping"] },
  { label: "real estate", category: "professional", keywords: ["real estate", "realtor", "property", "broker"] },
  { label: "architecture", category: "professional", keywords: ["architect", "architecture"] },
  { label: "salon & spa", category: "services", keywords: ["salon", "spa", "barber", "beauty salon"] },
  { label: "fitness", category: "services", keywords: ["gym", "fitness", "yoga", "personal trainer"] },
  { label: "home services", category: "services", keywords: ["plumbing", "electrician", "cleaning", "hvac", "repair"] },
  { label: "photography", category: "services", keywords: ["photography", "photographer"] },
  { label: "education & coaching", category: "services", keywords: ["tutoring", "coaching", "training", "academy"] },
  { label: "creative portfolio", category: "creator", keywords: ["portfolio", "creator", "artist", "influencer"] },
  { label: "saas", category: "other", keywords: ["saas", "software", "app", "platform", "startup"] },
  { label: "nonprofit", category: "other", keywords: ["nonprofit", "ngo", "charity", "foundation"] },
];

export const BUSINESS_TYPE_LEXICON: LexiconEntry<AiBusinessType>[] = [
  {
    id: "restaurant",
    keywords: ["restaurant", "cafe", "café", "bakery", "bistro", "bar", "diner"],
  },
  {
    id: "online_store",
    keywords: [
      "online store",
      "ecommerce",
      "e-commerce",
      "shopify",
      "sell online",
      "webshop",
      "online shop",
    ],
  },
  {
    id: "local_business",
    keywords: [
      "local",
      "neighborhood",
      "neighbourhood",
      "near me",
      "storefront",
      "brick and mortar",
      "walk-in",
    ],
  },
  {
    id: "professional_practice",
    keywords: [
      "law firm",
      "clinic",
      "dental",
      "practice",
      "attorney",
      "doctor",
      "accountant",
    ],
  },
  {
    id: "service_provider",
    keywords: ["service", "services", "agency", "studio", "consultancy", "consulting"],
  },
  {
    id: "creator",
    keywords: ["creator", "portfolio", "influencer", "personal brand", "artist"],
  },
  {
    id: "saas",
    keywords: ["saas", "software as a service", "b2b software", "platform", "app"],
  },
  {
    id: "nonprofit",
    keywords: ["nonprofit", "non-profit", "ngo", "charity", "foundation"],
  },
];

export const TONE_LEXICON: LexiconEntry<AiGenerationTone>[] = [
  {
    id: "luxury",
    keywords: ["luxury", "premium", "exclusive", "high-end", "elegant", "upscale", "bespoke"],
  },
  {
    id: "spiritual",
    keywords: ["spiritual", "mindful", "meditation", "holistic", "wellness", "yoga", "sacred"],
  },
  {
    id: "playful",
    keywords: ["playful", "fun", "quirky", "colorful", "colourful", "whimsical", "kids", "children"],
  },
  {
    id: "bold",
    keywords: ["bold", "loud", "striking", "edgy", "disruptive", "powerful"],
  },
  {
    id: "minimal",
    keywords: ["minimal", "minimalist", "clean", "simple", "sparse", "uncluttered"],
  },
  {
    id: "warm",
    keywords: ["warm", "cozy", "cosy", "welcoming", "homey", "homely", "family"],
  },
  {
    id: "friendly",
    keywords: ["friendly", "approachable", "casual", "relaxed", "neighborly", "neighbourly"],
  },
  {
    id: "professional",
    keywords: ["professional", "corporate", "formal", "trusted", "reliable", "expert"],
  },
];

export const PERSONALITY_LEXICON: LexiconEntry<AiBrandPersonality>[] = [
  { id: "premium", keywords: ["premium", "luxury", "exclusive", "high-end"] },
  { id: "trustworthy", keywords: ["trusted", "trust", "reliable", "certified", "licensed"] },
  { id: "innovative", keywords: ["innovative", "modern", "cutting-edge", "tech", "ai"] },
  { id: "friendly", keywords: ["friendly", "welcoming", "approachable", "warm"] },
  { id: "caring", keywords: ["caring", "compassionate", "holistic", "wellness", "family"] },
  { id: "expert", keywords: ["expert", "specialist", "professional", "certified"] },
  { id: "energetic", keywords: ["energetic", "vibrant", "dynamic", "bold", "fun"] },
  { id: "calm", keywords: ["calm", "peaceful", "serene", "minimal", "zen"] },
  { id: "authentic", keywords: ["authentic", "handmade", "artisan", "local", "organic"] },
  { id: "modern", keywords: ["modern", "contemporary", "sleek", "minimal"] },
];

export const VISUAL_STYLE_LEXICON: LexiconEntry<AiVisualStyle>[] = [
  { id: "elegant", keywords: ["elegant", "luxury", "refined", "premium", "serif"] },
  { id: "minimal", keywords: ["minimal", "minimalist", "clean", "simple"] },
  { id: "bold", keywords: ["bold", "striking", "high contrast", "loud"] },
  { id: "playful", keywords: ["playful", "fun", "colorful", "colourful", "kids"] },
  { id: "corporate", keywords: ["corporate", "professional", "business", "b2b"] },
  { id: "organic", keywords: ["organic", "natural", "earth", "green", "eco"] },
  { id: "tech", keywords: ["tech", "saas", "software", "startup", "digital"] },
  { id: "editorial", keywords: ["editorial", "magazine", "blog", "publisher", "media"] },
];

export const COLOUR_DIRECTION_LEXICON: LexiconEntry<AiColourDirection>[] = [
  { id: "dark_luxury", keywords: ["luxury", "black and gold", "dark", "midnight", "noir"] },
  { id: "warm", keywords: ["warm", "terracotta", "orange", "amber", "cozy", "cosy", "rust"] },
  { id: "cool", keywords: ["cool", "blue", "teal", "ocean", "ice", "sky"] },
  { id: "earth", keywords: ["earth", "organic", "green", "brown", "nature", "eco"] },
  { id: "vibrant", keywords: ["vibrant", "bright", "colorful", "colourful", "neon"] },
  { id: "pastel", keywords: ["pastel", "soft", "blush", "lavender", "mint"] },
  { id: "monochrome", keywords: ["monochrome", "black and white", "grayscale", "greyscale"] },
  { id: "neutral", keywords: ["neutral", "beige", "cream", "sand", "minimal"] },
];

export const AUDIENCE_PATTERNS: Array<{
  label: string;
  patterns: RegExp[];
  keywords: string[];
}> = [
  {
    label: "families",
    patterns: [/for\s+families?\b/i, /family[- ]friendly/i],
    keywords: ["families", "parents", "kids", "children"],
  },
  {
    label: "professionals",
    patterns: [/for\s+professionals?\b/i, /b2b\b/i],
    keywords: ["professionals", "executives", "business owners", "b2b"],
  },
  {
    label: "local residents",
    patterns: [/local\s+(customers?|clients?|residents?)/i],
    keywords: ["locals", "neighborhood", "neighbourhood", "community"],
  },
  {
    label: "young adults",
    patterns: [/gen[- ]?z\b/i, /millennials?\b/i],
    keywords: ["young adults", "students", "gen z", "millennials"],
  },
  {
    label: "luxury shoppers",
    patterns: [/affluent\b/i, /high[- ]net[- ]worth/i],
    keywords: ["luxury shoppers", "affluent", "discerning"],
  },
  {
    label: "small businesses",
    patterns: [/small\s+business(es)?\b/i, /smes?\b/i],
    keywords: ["small businesses", "startups", "sme"],
  },
  {
    label: "patients",
    patterns: [/patients?\b/i],
    keywords: ["patients"],
  },
  {
    label: "clients",
    patterns: [/clients?\b/i],
    keywords: ["clients"],
  },
];

export const COUNTRY_LEXICON: Array<{
  code: string;
  names: string[];
  defaultLanguage: string;
  defaultRegion?: string;
}> = [
  {
    code: "IN",
    names: ["india", "indian", "bharat"],
    defaultLanguage: "en",
  },
  {
    code: "US",
    names: ["united states", "usa", "u.s.", "u.s.a.", "america", "american"],
    defaultLanguage: "en",
  },
  {
    code: "GB",
    names: ["united kingdom", "uk", "u.k.", "britain", "british", "england"],
    defaultLanguage: "en",
  },
  {
    code: "AE",
    names: ["uae", "u.a.e.", "dubai", "abu dhabi", "united arab emirates"],
    defaultLanguage: "en",
    defaultRegion: "Dubai",
  },
  {
    code: "AU",
    names: ["australia", "australian"],
    defaultLanguage: "en",
  },
  {
    code: "CA",
    names: ["canada", "canadian"],
    defaultLanguage: "en",
  },
  {
    code: "SG",
    names: ["singapore", "singaporean"],
    defaultLanguage: "en",
  },
  {
    code: "MY",
    names: ["malaysia", "malaysian"],
    defaultLanguage: "en",
  },
  {
    code: "PK",
    names: ["pakistan", "pakistani"],
    defaultLanguage: "en",
  },
  {
    code: "BD",
    names: ["bangladesh", "bangladeshi"],
    defaultLanguage: "en",
  },
  {
    code: "LK",
    names: ["sri lanka", "srilanka", "sri lankan"],
    defaultLanguage: "en",
  },
  {
    code: "NP",
    names: ["nepal", "nepali", "nepalese"],
    defaultLanguage: "en",
  },
];

/** Indian states / major cities (and a few global hubs) for region detection. */
export const REGION_LEXICON: Array<{
  region: string;
  country: string;
  keywords: string[];
}> = [
  { region: "Kerala", country: "IN", keywords: ["kerala", "kochi", "cochin", "trivandrum", "thiruvananthapuram", "calicut", "kozhikode", "thrissur"] },
  { region: "Karnataka", country: "IN", keywords: ["karnataka", "bangalore", "bengaluru", "mysore", "mysuru"] },
  { region: "Maharashtra", country: "IN", keywords: ["maharashtra", "mumbai", "pune", "nagpur"] },
  { region: "Tamil Nadu", country: "IN", keywords: ["tamil nadu", "chennai", "coimbatore", "madurai"] },
  { region: "Delhi NCR", country: "IN", keywords: ["delhi", "new delhi", "noida", "gurgaon", "gurugram", "ncr"] },
  { region: "Telangana", country: "IN", keywords: ["telangana", "hyderabad"] },
  { region: "West Bengal", country: "IN", keywords: ["west bengal", "kolkata", "calcutta"] },
  { region: "Gujarat", country: "IN", keywords: ["gujarat", "ahmedabad", "surat"] },
  { region: "Rajasthan", country: "IN", keywords: ["rajasthan", "jaipur", "udaipur"] },
  { region: "Goa", country: "IN", keywords: ["goa"] },
  { region: "Dubai", country: "AE", keywords: ["dubai"] },
  { region: "London", country: "GB", keywords: ["london"] },
  { region: "New York", country: "US", keywords: ["new york", "nyc", "manhattan"] },
  { region: "California", country: "US", keywords: ["california", "los angeles", "san francisco", "bay area"] },
  { region: "Singapore", country: "SG", keywords: ["singapore"] },
];

export const LANGUAGE_KEYWORD_LEXICON: Array<{
  code: string;
  keywords: string[];
}> = [
  { code: "en", keywords: ["english", "in english"] },
  { code: "ml", keywords: ["malayalam", "in malayalam"] },
  { code: "hi", keywords: ["hindi", "in hindi"] },
  { code: "ta", keywords: ["tamil", "in tamil"] },
  { code: "te", keywords: ["telugu", "in telugu"] },
  { code: "kn", keywords: ["kannada", "in kannada"] },
  { code: "bn", keywords: ["bengali", "bangla", "in bengali"] },
  { code: "mr", keywords: ["marathi", "in marathi"] },
  { code: "gu", keywords: ["gujarati", "in gujarati"] },
  { code: "ar", keywords: ["arabic", "in arabic"] },
  { code: "es", keywords: ["spanish", "in spanish"] },
  { code: "fr", keywords: ["french", "in french"] },
  { code: "de", keywords: ["german", "in german"] },
  { code: "pt", keywords: ["portuguese", "in portuguese"] },
];

export type CategoryDefaults = {
  businessType: AiBusinessType;
  audience: string;
  tone: AiGenerationTone;
  brandPersonality: AiBrandPersonality[];
  primaryCta: { label: string; href: string };
  pages: PageType[];
  features: string[];
  trustSignals: string[];
  contactPreferences: AiContactPreference[];
  seoSeed: string[];
  visualStyle: AiVisualStyle;
  colourDirection: AiColourDirection;
  templateHint: "classic" | "showcase" | "catalog";
};

export const CATEGORY_DEFAULTS: Record<SiteCategoryId, CategoryDefaults> = {
  restaurant: {
    businessType: "restaurant",
    audience: "diners and local food lovers",
    tone: "warm",
    brandPersonality: ["friendly", "authentic", "caring"],
    primaryCta: { label: "Reserve a table", href: "/contact" },
    pages: ["home", "about", "products", "contact"],
    features: ["menu", "reservations", "location hours", "gallery"],
    trustSignals: ["reviews", "chef credentials", "hygiene ratings"],
    contactPreferences: ["form", "phone", "whatsapp", "booking"],
    seoSeed: ["menu", "restaurant", "reservations", "dining"],
    visualStyle: "organic",
    colourDirection: "warm",
    templateHint: "catalog",
  },
  retail: {
    businessType: "online_store",
    audience: "shoppers looking for curated products",
    tone: "friendly",
    brandPersonality: ["modern", "authentic", "friendly"],
    primaryCta: { label: "Shop now", href: "/products" },
    pages: ["home", "products", "collections", "about", "contact"],
    features: ["product catalog", "collections", "shipping info", "returns policy"],
    trustSignals: ["reviews", "secure checkout", "return policy"],
    contactPreferences: ["form", "email", "whatsapp", "chat"],
    seoSeed: ["shop", "buy", "products", "store"],
    visualStyle: "bold",
    colourDirection: "vibrant",
    templateHint: "catalog",
  },
  professional: {
    businessType: "professional_practice",
    audience: "clients seeking trusted expertise",
    tone: "professional",
    brandPersonality: ["trustworthy", "expert", "modern"],
    primaryCta: { label: "Book a consultation", href: "/contact" },
    pages: ["home", "about", "blog", "contact"],
    features: ["services list", "credentials", "appointment booking", "faq"],
    trustSignals: ["credentials", "certifications", "testimonials", "years of experience"],
    contactPreferences: ["form", "phone", "email", "booking"],
    seoSeed: ["consultation", "expert", "services", "professional"],
    visualStyle: "corporate",
    colourDirection: "cool",
    templateHint: "classic",
  },
  services: {
    businessType: "service_provider",
    audience: "customers who need reliable local services",
    tone: "friendly",
    brandPersonality: ["trustworthy", "friendly", "expert"],
    primaryCta: { label: "Get a quote", href: "/contact" },
    pages: ["home", "about", "products", "contact"],
    features: ["service packages", "quote request", "before/after gallery", "faq"],
    trustSignals: ["reviews", "licensed", "insured", "testimonials"],
    contactPreferences: ["form", "phone", "whatsapp"],
    seoSeed: ["services", "quote", "booking", "local"],
    visualStyle: "corporate",
    colourDirection: "neutral",
    templateHint: "classic",
  },
  creator: {
    businessType: "creator",
    audience: "followers and collaborators",
    tone: "bold",
    brandPersonality: ["authentic", "energetic", "modern"],
    primaryCta: { label: "Work with me", href: "/contact" },
    pages: ["home", "about", "blog", "contact"],
    features: ["portfolio gallery", "about story", "social links", "booking"],
    trustSignals: ["featured work", "press mentions", "client logos"],
    contactPreferences: ["form", "email", "chat"],
    seoSeed: ["portfolio", "creator", "work with", "projects"],
    visualStyle: "editorial",
    colourDirection: "vibrant",
    templateHint: "showcase",
  },
  other: {
    businessType: "other",
    audience: "website visitors",
    tone: "professional",
    brandPersonality: ["modern", "trustworthy"],
    primaryCta: { label: "Contact us", href: "/contact" },
    pages: ["home", "about", "contact"],
    features: ["about", "contact form", "clear navigation"],
    trustSignals: ["testimonials", "clear contact details"],
    contactPreferences: ["form", "email"],
    seoSeed: ["website", "contact", "about"],
    visualStyle: "minimal",
    colourDirection: "neutral",
    templateHint: "classic",
  },
};
