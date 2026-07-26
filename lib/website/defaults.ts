import type {
  ButtonStyle,
  FooterColumn,
  FooterSocialLink,
} from "@/lib/website/types";
import { DEFAULT_THEME_TOKENS } from "@/lib/website/theme/defaults";
import { coreFieldsFromTokens } from "@/lib/website/theme/normalize";
import {
  buildTemplatePages,
  type DefaultPageSeed,
} from "@/lib/website/templates";

export type { DefaultPageSeed };

const defaultCore = coreFieldsFromTokens(DEFAULT_THEME_TOKENS);

export const DEFAULT_THEME = {
  primaryColor: defaultCore.primaryColor,
  secondaryColor: defaultCore.secondaryColor,
  backgroundColor: defaultCore.backgroundColor,
  textColor: defaultCore.textColor,
  mutedColor: defaultCore.mutedColor,
  fontHeading: defaultCore.fontHeading,
  fontBody: defaultCore.fontBody,
  borderRadius: defaultCore.borderRadius,
  buttonStyle: defaultCore.buttonStyle as ButtonStyle,
  logoMediaId: null as string | null,
  faviconMediaId: null as string | null,
  customCss: null as string | null,
  tokens: DEFAULT_THEME_TOKENS,
};

export const DEFAULT_HEADER = {
  logoText: null as string | null,
  logoMediaId: null as string | null,
  showLogo: true,
  sticky: true,
  backgroundColor: null as string | null,
  textColor: null as string | null,
  ctaLabel: "Get started",
  ctaHref: "/contact",
  ctaStyle: "primary" as ButtonStyle,
};

export const DEFAULT_FOOTER = {
  copyrightText: null as string | null,
  showSocial: false,
  socialLinks: [] as FooterSocialLink[],
  columns: [] as FooterColumn[],
  backgroundColor: null as string | null,
  textColor: null as string | null,
};

export const DEFAULT_SEO = {
  defaultTitle: null as string | null,
  defaultDescription: null as string | null,
  ogImageMediaId: null as string | null,
  twitterHandle: null as string | null,
  robots: "index,follow",
  canonicalBaseUrl: null as string | null,
  jsonLd: null as string | null,
};

export function buildDefaultPages(siteName: string): DefaultPageSeed[] {
  return buildTemplatePages({
    siteName,
    template: "classic",
    category: "other",
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => boolean,
): string {
  const root = slugify(base) || "site";
  if (!exists(root)) return root;
  let i = 2;
  while (exists(`${root}-${i}`)) {
    i += 1;
  }
  return `${root}-${i}`;
}
