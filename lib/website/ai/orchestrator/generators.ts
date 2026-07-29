/**
 * Deterministic section label → generator id mapping.
 * Unknown labels fall back to kebab-case + "-generator".
 */

/** Known section labels (lowercase) → generator ids. */
export const SECTION_TO_GENERATOR: Record<string, string> = {
  hero: "hero-generator",
  featured: "featured-generator",
  collections: "collection-generator",
  "featured collections": "featured-collections-generator",
  benefits: "benefit-generator",
  features: "feature-generator",
  testimonials: "testimonial-generator",
  faq: "faq-generator",
  cta: "cta-generator",
  footer: "footer-generator",
  form: "form-generator",
  gallery: "gallery-generator",
  filters: "filter-generator",
  process: "process-generator",
  story: "story-generator",
  trust: "trust-generator",
  details: "details-generator",
  products: "product-generator",
  services: "service-generator",
  menu: "menu-generator",
  content: "content-generator",
  "blog list": "blog-list-generator",
};

function kebabCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Map a WebsitePlan section label to a stable generator id.
 * Pure / sync — same label always yields the same id.
 */
export function resolveGeneratorId(section: string): string {
  const key = section.trim().toLowerCase().replace(/\s+/g, " ");
  if (SECTION_TO_GENERATOR[key]) {
    return SECTION_TO_GENERATOR[key];
  }
  const slug = kebabCase(section);
  return slug ? `${slug}-generator` : "section-generator";
}
