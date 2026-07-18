export const SITE_STATUSES = ["draft", "published", "unpublished"] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export const PAGE_TYPES = [
  "home",
  "about",
  "contact",
  "products",
  "collections",
  "blog",
  "custom",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PAGE_STATUSES = ["draft", "published"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export const SECTION_TYPES = [
  "hero",
  "richText",
  "image",
  "features",
  "cta",
  "products",
  "collections",
  "form",
  "blogList",
  "gallery",
  "spacer",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const BUTTON_STYLES = ["primary", "secondary", "outline"] as const;
export type ButtonStyle = (typeof BUTTON_STYLES)[number];

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "checkbox",
  "number",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const FORM_STATUSES = ["active", "archived"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export type WebsiteSite = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: SiteStatus;
  customDomain: string | null;
  domainVerified: boolean;
  domainVerificationToken: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteTheme = {
  id: string;
  siteId: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  buttonStyle: ButtonStyle;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  customCss: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteHeader = {
  id: string;
  siteId: string;
  logoText: string | null;
  logoMediaId: string | null;
  showLogo: boolean;
  sticky: boolean;
  backgroundColor: string | null;
  textColor: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  ctaStyle: ButtonStyle;
  createdAt: string;
  updatedAt: string;
};

export type FooterSocialLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

export type WebsiteFooter = {
  id: string;
  siteId: string;
  copyrightText: string | null;
  showSocial: boolean;
  socialLinks: FooterSocialLink[];
  columns: FooterColumn[];
  backgroundColor: string | null;
  textColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteNavItem = {
  id: string;
  siteId: string;
  label: string;
  href: string | null;
  pageId: string | null;
  sortOrder: number;
  openInNewTab: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteSeo = {
  id: string;
  siteId: string;
  defaultTitle: string | null;
  defaultDescription: string | null;
  ogImageMediaId: string | null;
  twitterHandle: string | null;
  robots: string;
  canonicalBaseUrl: string | null;
  jsonLd: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsitePage = {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  pageType: PageType;
  status: PageStatus;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageMediaId: string | null;
  seoRobots: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SectionSettings = {
  paddingY?: "none" | "sm" | "md" | "lg" | "xl";
  background?: string;
  hidden?: boolean;
  fullWidth?: boolean;
};

export type WebsiteSection = {
  id: string;
  pageId: string;
  type: SectionType;
  sortOrder: number;
  content: Record<string, unknown>;
  settings: SectionSettings;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteBlogPost = {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverMediaId: string | null;
  authorName: string | null;
  status: BlogStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteMedia = {
  id: string;
  workspaceId: string;
  siteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteForm = {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  description: string | null;
  successMessage: string;
  notifyEmail: string | null;
  status: FormStatus;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteFormField = {
  id: string;
  formId: string;
  label: string;
  name: string;
  fieldType: FormFieldType;
  placeholder: string | null;
  required: boolean;
  options: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type WebsiteFormSubmission = {
  id: string;
  formId: string;
  siteId: string;
  payload: Record<string, unknown>;
  sourceUrl: string | null;
  ipHash: string | null;
  createdAt: string;
};

export type WebsiteFormWithFields = WebsiteForm & {
  fields: WebsiteFormField[];
};

export type SiteBundle = {
  site: WebsiteSite;
  theme: WebsiteTheme;
  header: WebsiteHeader;
  footer: WebsiteFooter;
  navigation: WebsiteNavItem[];
  seo: WebsiteSeo;
  pages: WebsitePage[];
};

export function isSiteStatus(value: unknown): value is SiteStatus {
  return (
    typeof value === "string" &&
    (SITE_STATUSES as readonly string[]).includes(value)
  );
}

export function isPageType(value: unknown): value is PageType {
  return (
    typeof value === "string" &&
    (PAGE_TYPES as readonly string[]).includes(value)
  );
}

export function isSectionType(value: unknown): value is SectionType {
  return (
    typeof value === "string" &&
    (SECTION_TYPES as readonly string[]).includes(value)
  );
}

export function isFormFieldType(value: unknown): value is FormFieldType {
  return (
    typeof value === "string" &&
    (FORM_FIELD_TYPES as readonly string[]).includes(value)
  );
}

export function isButtonStyle(value: unknown): value is ButtonStyle {
  return (
    typeof value === "string" &&
    (BUTTON_STYLES as readonly string[]).includes(value)
  );
}
