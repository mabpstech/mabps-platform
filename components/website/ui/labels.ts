import type { SectionType, SiteStatus } from "@/lib/website/types";

/** Business-friendly labels for section content keys. */
export const CONTENT_FIELD_LABELS: Record<string, string> = {
  eyebrow: "Small label above headline",
  heading: "Headline",
  subheading: "Supporting text",
  body: "Body text",
  primaryLabel: "Primary button text",
  primaryHref: "Primary button link",
  secondaryLabel: "Secondary button text",
  secondaryHref: "Secondary button link",
  buttonLabel: "Button text",
  buttonHref: "Button link",
  formSlug: "Form",
  caption: "Caption",
  alt: "Image description",
  mediaId: "Image",
  mediaIds: "Gallery images",
  html: "Content",
  height: "Height",
  align: "Alignment",
  overlay: "Dark overlay",
  backgroundMediaId: "Background image",
  mobileMediaId: "Mobile image",
  desktopMediaId: "Desktop image",
  backgroundVideoUrl: "Background video URL",
  animation: "Entrance animation",
  items: "Items",
  limit: "Number of posts",
};

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero banner",
  richText: "Text block",
  image: "Image",
  features: "Features",
  cta: "Call to action",
  products: "Products",
  collections: "Collections",
  form: "Form",
  blogList: "Blog posts",
  gallery: "Gallery",
  spacer: "Spacer",
};

export const STATUS_LABELS: Record<SiteStatus, string> = {
  draft: "Draft",
  published: "Live",
  unpublished: "Unpublished",
};

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfYesterday && date < startOfToday) {
    return "yesterday";
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function slugifyName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const MEDIA_SIZE_HINTS = {
  logo: "Recommended: 512×512 PNG or SVG",
  hero: "Recommended: 1920×1080 JPG or WebP",
  banner: "Recommended: 1600×600 JPG or WebP",
  product: "Recommended: 1200×1200 JPG or WebP",
  og: "Recommended: 1200×630 JPG or WebP",
  cover: "Recommended: 1600×900 JPG or WebP",
  favicon: "Recommended: 32×32 or 64×64 PNG",
} as const;
