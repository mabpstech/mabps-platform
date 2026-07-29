import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  DEFAULT_FOOTER,
  DEFAULT_HEADER,
  DEFAULT_SEO,
  DEFAULT_THEME,
  ensureUniqueSlug,
  slugify,
} from "@/lib/website/defaults";
import {
  buildTemplatePages,
  type DefaultPageSeed,
  type SiteCategoryId,
  type SiteTemplateId,
} from "@/lib/website/templates";
import { migrateWebsiteSchema } from "@/lib/website/migrate";
import { mediaKindFromMime } from "@/lib/website/media-kind";
import {
  requireSafeCustomCss,
  requireSafeJsonLd,
  sanitizeSectionContent,
} from "@/lib/website/sanitize";
import {
  coreFieldsFromTokens,
  normalizeThemeTokens,
} from "@/lib/website/theme/normalize";
import type { ThemeTokens } from "@/lib/website/theme/types";
import {
  isButtonStyle,
  type BlogStatus,
  type ButtonStyle,
  type FooterColumn,
  type FooterSocialLink,
  type FormFieldType,
  type FormStatus,
  type MediaKind,
  type MediaListQuery,
  type MediaVariants,
  type PageStatus,
  type PageType,
  type PublishEventAction,
  type SectionSettings,
  type SectionType,
  type SiteStatus,
  type WebsiteBlogPost,
  type WebsiteFooter,
  type WebsiteForm,
  type WebsiteFormField,
  type WebsiteFormSubmission,
  type WebsiteFormWithFields,
  type WebsiteHeader,
  type WebsiteMedia,
  type WebsiteMediaFolder,
  type WebsiteNavItem,
  type WebsitePage,
  type WebsitePublishEvent,
  type WebsiteSection,
  type WebsiteSeo,
  type WebsiteSite,
  type WebsiteTheme,
} from "@/lib/website/types";
import { sqlite } from "@/lib/db";

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToSite(row: Record<string, unknown>): WebsiteSite {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    name: String(row.name),
    slug: String(row.slug),
    status: row.status as SiteStatus,
    customDomain: row.customDomain ? String(row.customDomain) : null,
    domainVerified: Boolean(row.domainVerified),
    domainVerificationToken: row.domainVerificationToken
      ? String(row.domainVerificationToken)
      : null,
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToTheme(row: Record<string, unknown>): WebsiteTheme {
  const legacy = {
    primaryColor: String(row.primaryColor),
    secondaryColor: String(row.secondaryColor),
    backgroundColor: String(row.backgroundColor),
    textColor: String(row.textColor),
    mutedColor: String(row.mutedColor),
    fontHeading: String(row.fontHeading),
    fontBody: String(row.fontBody),
    borderRadius: String(row.borderRadius),
    buttonStyle: row.buttonStyle as ButtonStyle,
    logoMediaId: row.logoMediaId ? String(row.logoMediaId) : null,
    faviconMediaId: row.faviconMediaId ? String(row.faviconMediaId) : null,
  };
  const tokens = normalizeThemeTokens(parseJson(row.tokens, {}), legacy);
  const core = coreFieldsFromTokens(tokens);
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    primaryColor: core.primaryColor,
    secondaryColor: core.secondaryColor,
    backgroundColor: core.backgroundColor,
    textColor: core.textColor,
    mutedColor: core.mutedColor,
    fontHeading: core.fontHeading,
    fontBody: core.fontBody,
    borderRadius: core.borderRadius,
    buttonStyle: core.buttonStyle,
    logoMediaId: core.logoMediaId,
    faviconMediaId: core.faviconMediaId,
    customCss: row.customCss ? String(row.customCss) : null,
    tokens,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToHeader(row: Record<string, unknown>): WebsiteHeader {
  const extras = parseJson<{
    logoSize?: "sm" | "md" | "lg";
    announcementText?: string | null;
    announcementEnabled?: boolean;
    showSearch?: boolean;
    showCart?: boolean;
  }>(row.uxExtras, {});
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    logoText: row.logoText ? String(row.logoText) : null,
    logoMediaId: row.logoMediaId ? String(row.logoMediaId) : null,
    showLogo: Boolean(row.showLogo),
    sticky: Boolean(row.sticky),
    backgroundColor: row.backgroundColor ? String(row.backgroundColor) : null,
    textColor: row.textColor ? String(row.textColor) : null,
    ctaLabel: row.ctaLabel ? String(row.ctaLabel) : null,
    ctaHref: row.ctaHref ? String(row.ctaHref) : null,
    ctaStyle: (row.ctaStyle as ButtonStyle) || "primary",
    logoSize: extras.logoSize === "sm" || extras.logoSize === "lg" ? extras.logoSize : "md",
    announcementText: extras.announcementText ?? null,
    announcementEnabled: Boolean(extras.announcementEnabled),
    showSearch: Boolean(extras.showSearch),
    showCart: Boolean(extras.showCart),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToFooter(row: Record<string, unknown>): WebsiteFooter {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    copyrightText: row.copyrightText ? String(row.copyrightText) : null,
    showSocial: Boolean(row.showSocial),
    socialLinks: parseJson<FooterSocialLink[]>(row.socialLinks, []),
    columns: parseJson<FooterColumn[]>(row.columns, []),
    backgroundColor: row.backgroundColor ? String(row.backgroundColor) : null,
    textColor: row.textColor ? String(row.textColor) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToNavItem(row: Record<string, unknown>): WebsiteNavItem {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    label: String(row.label),
    href: row.href ? String(row.href) : null,
    pageId: row.pageId ? String(row.pageId) : null,
    parentId: row.parentId ? String(row.parentId) : null,
    sortOrder: Number(row.sortOrder ?? 0),
    openInNewTab: Boolean(row.openInNewTab),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function hrefForPage(page: WebsitePage): string {
  if (page.pageType === "home" || page.slug === "home") return "/";
  return `/${page.slug}`;
}

function rowToSeo(row: Record<string, unknown>): WebsiteSeo {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    defaultTitle: row.defaultTitle ? String(row.defaultTitle) : null,
    defaultDescription: row.defaultDescription
      ? String(row.defaultDescription)
      : null,
    ogImageMediaId: row.ogImageMediaId ? String(row.ogImageMediaId) : null,
    twitterHandle: row.twitterHandle ? String(row.twitterHandle) : null,
    robots: String(row.robots ?? "index,follow"),
    canonicalBaseUrl: row.canonicalBaseUrl
      ? String(row.canonicalBaseUrl)
      : null,
    jsonLd: row.jsonLd ? String(row.jsonLd) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToPage(row: Record<string, unknown>): WebsitePage {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    title: String(row.title),
    slug: String(row.slug),
    pageType: row.pageType as PageType,
    status: row.status as PageStatus,
    sortOrder: Number(row.sortOrder ?? 0),
    seoTitle: row.seoTitle ? String(row.seoTitle) : null,
    seoDescription: row.seoDescription ? String(row.seoDescription) : null,
    seoOgImageMediaId: row.seoOgImageMediaId
      ? String(row.seoOgImageMediaId)
      : null,
    seoRobots: row.seoRobots ? String(row.seoRobots) : null,
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSection(row: Record<string, unknown>): WebsiteSection {
  return {
    id: String(row.id),
    pageId: String(row.pageId),
    type: row.type as SectionType,
    sortOrder: Number(row.sortOrder ?? 0),
    content: parseJson<Record<string, unknown>>(row.content, {}),
    settings: parseJson<SectionSettings>(row.settings, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToBlogPost(row: Record<string, unknown>): WebsiteBlogPost {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    title: String(row.title),
    slug: String(row.slug),
    excerpt: row.excerpt ? String(row.excerpt) : null,
    content: String(row.content ?? ""),
    coverMediaId: row.coverMediaId ? String(row.coverMediaId) : null,
    authorName: row.authorName ? String(row.authorName) : null,
    status: row.status as BlogStatus,
    seoTitle: row.seoTitle ? String(row.seoTitle) : null,
    seoDescription: row.seoDescription ? String(row.seoDescription) : null,
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMedia(row: Record<string, unknown>): WebsiteMedia {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    siteId: String(row.siteId),
    filename: String(row.filename),
    originalName: String(row.originalName),
    mimeType: String(row.mimeType),
    sizeBytes: Number(row.sizeBytes ?? 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    alt: row.alt ? String(row.alt) : null,
    storagePath: String(row.storagePath),
    folderId: row.folderId ? String(row.folderId) : null,
    favorited: Number(row.favorited ?? 0) === 1,
    lastUsedAt: row.lastUsedAt ? String(row.lastUsedAt) : null,
    uploadedByUserId: row.uploadedByUserId
      ? String(row.uploadedByUserId)
      : null,
    uploadedByName: row.uploadedByName ? String(row.uploadedByName) : null,
    variants: parseJson<MediaVariants>(row.variants, {}),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToMediaFolder(row: Record<string, unknown>): WebsiteMediaFolder {
  return {
    id: String(row.id),
    workspaceId: String(row.workspaceId),
    siteId: String(row.siteId),
    name: String(row.name),
    parentId: row.parentId ? String(row.parentId) : null,
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToForm(row: Record<string, unknown>): WebsiteForm {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    successMessage: String(
      row.successMessage ?? "Thanks — we received your submission.",
    ),
    notifyEmail: row.notifyEmail ? String(row.notifyEmail) : null,
    status: row.status as FormStatus,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToFormField(row: Record<string, unknown>): WebsiteFormField {
  return {
    id: String(row.id),
    formId: String(row.formId),
    label: String(row.label),
    name: String(row.name),
    fieldType: row.fieldType as FormFieldType,
    placeholder: row.placeholder ? String(row.placeholder) : null,
    required: Boolean(row.required),
    options: parseJson<string[]>(row.options, []),
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function rowToSubmission(row: Record<string, unknown>): WebsiteFormSubmission {
  return {
    id: String(row.id),
    formId: String(row.formId),
    siteId: String(row.siteId),
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    sourceUrl: row.sourceUrl ? String(row.sourceUrl) : null,
    ipHash: row.ipHash ? String(row.ipHash) : null,
    createdAt: String(row.createdAt),
  };
}

export function ensureWebsiteReady(): void {
  migrateWebsiteSchema();
  ensureWebsiteHeaderExtrasColumn();
  ensureWebsiteNavParentIdColumn();
  ensureWebsiteThemeTokensColumn();
  ensureMediaDamColumns();
}

function ensureWebsiteHeaderExtrasColumn(): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info("website_header")`)
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "uxExtras")) {
    sqlite.exec(
      `ALTER TABLE "website_header" ADD COLUMN "uxExtras" text not null default '{}'`,
    );
  }
}

function ensureWebsiteNavParentIdColumn(): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info("website_nav_item")`)
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "parentId")) {
    sqlite.exec(`ALTER TABLE "website_nav_item" ADD COLUMN "parentId" text`);
  }
}

function ensureWebsiteThemeTokensColumn(): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info("website_theme")`)
    .all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "tokens")) {
    sqlite.exec(
      `ALTER TABLE "website_theme" ADD COLUMN "tokens" text not null default '{}'`,
    );
  }
}

function ensureMediaDamColumns(): void {
  const columns = sqlite
    .prepare(`PRAGMA table_info("website_media")`)
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  const alters: string[] = [];
  if (!names.has("folderId")) {
    alters.push(`ALTER TABLE "website_media" ADD COLUMN "folderId" text`);
  }
  if (!names.has("favorited")) {
    alters.push(
      `ALTER TABLE "website_media" ADD COLUMN "favorited" integer not null default 0`,
    );
  }
  if (!names.has("lastUsedAt")) {
    alters.push(`ALTER TABLE "website_media" ADD COLUMN "lastUsedAt" text`);
  }
  if (!names.has("uploadedByUserId")) {
    alters.push(
      `ALTER TABLE "website_media" ADD COLUMN "uploadedByUserId" text`,
    );
  }
  if (!names.has("uploadedByName")) {
    alters.push(`ALTER TABLE "website_media" ADD COLUMN "uploadedByName" text`);
  }
  if (!names.has("variants")) {
    alters.push(
      `ALTER TABLE "website_media" ADD COLUMN "variants" text not null default '{}'`,
    );
  }
  for (const statement of alters) {
    sqlite.exec(statement);
  }
}

export function getSiteById(siteId: string): WebsiteSite | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_site" WHERE "id" = ?`)
    .get(siteId) as Record<string, unknown> | undefined;
  return row ? rowToSite(row) : null;
}

export function getSiteBySlug(slug: string): WebsiteSite | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_site" WHERE "slug" = ?`)
    .get(slug) as Record<string, unknown> | undefined;
  return row ? rowToSite(row) : null;
}

export function getSiteByCustomDomain(domain: string): WebsiteSite | null {
  ensureWebsiteReady();
  const normalized = domain.trim().toLowerCase();
  const row = sqlite
    .prepare(`SELECT * FROM "website_site" WHERE lower("customDomain") = ?`)
    .get(normalized) as Record<string, unknown> | undefined;
  return row ? rowToSite(row) : null;
}

export function listSitesForWorkspace(workspaceId: string): WebsiteSite[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_site" WHERE "workspaceId" = ? ORDER BY "createdAt" DESC`,
    )
    .all(workspaceId) as Record<string, unknown>[];
  return rows.map(rowToSite);
}

export function countSitesForWorkspace(workspaceId: string): number {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "website_site" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as { count: number };
  return Number(row.count ?? 0);
}

export function siteSlugExists(slug: string): boolean {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT "id" FROM "website_site" WHERE "slug" = ?`)
    .get(slug) as { id: string } | undefined;
  return Boolean(row);
}

function insertTheme(siteId: string, timestamp: string): WebsiteTheme {
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_theme" (
        "id", "siteId", "primaryColor", "secondaryColor", "backgroundColor",
        "textColor", "mutedColor", "fontHeading", "fontBody", "borderRadius",
        "buttonStyle", "logoMediaId", "faviconMediaId", "customCss", "tokens",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      siteId,
      DEFAULT_THEME.primaryColor,
      DEFAULT_THEME.secondaryColor,
      DEFAULT_THEME.backgroundColor,
      DEFAULT_THEME.textColor,
      DEFAULT_THEME.mutedColor,
      DEFAULT_THEME.fontHeading,
      DEFAULT_THEME.fontBody,
      DEFAULT_THEME.borderRadius,
      DEFAULT_THEME.buttonStyle,
      DEFAULT_THEME.logoMediaId,
      DEFAULT_THEME.faviconMediaId,
      DEFAULT_THEME.customCss,
      JSON.stringify(DEFAULT_THEME.tokens),
      timestamp,
      timestamp,
    );
  return getThemeBySiteId(siteId)!;
}

function insertHeader(
  siteId: string,
  siteName: string,
  timestamp: string,
): WebsiteHeader {
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_header" (
        "id", "siteId", "logoText", "logoMediaId", "showLogo", "sticky",
        "backgroundColor", "textColor", "ctaLabel", "ctaHref", "ctaStyle",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      siteId,
      siteName,
      DEFAULT_HEADER.logoMediaId,
      DEFAULT_HEADER.showLogo ? 1 : 0,
      DEFAULT_HEADER.sticky ? 1 : 0,
      DEFAULT_HEADER.backgroundColor,
      DEFAULT_HEADER.textColor,
      DEFAULT_HEADER.ctaLabel,
      DEFAULT_HEADER.ctaHref,
      DEFAULT_HEADER.ctaStyle,
      timestamp,
      timestamp,
    );
  return getHeaderBySiteId(siteId)!;
}

function insertFooter(
  siteId: string,
  siteName: string,
  timestamp: string,
): WebsiteFooter {
  const id = randomUUID();
  const copyright = `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`;
  sqlite
    .prepare(
      `INSERT INTO "website_footer" (
        "id", "siteId", "copyrightText", "showSocial", "socialLinks", "columns",
        "backgroundColor", "textColor", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      siteId,
      copyright,
      DEFAULT_FOOTER.showSocial ? 1 : 0,
      JSON.stringify(DEFAULT_FOOTER.socialLinks),
      JSON.stringify(DEFAULT_FOOTER.columns),
      DEFAULT_FOOTER.backgroundColor,
      DEFAULT_FOOTER.textColor,
      timestamp,
      timestamp,
    );
  return getFooterBySiteId(siteId)!;
}

function insertSeo(siteId: string, siteName: string, timestamp: string): WebsiteSeo {
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_seo" (
        "id", "siteId", "defaultTitle", "defaultDescription", "ogImageMediaId",
        "twitterHandle", "robots", "canonicalBaseUrl", "jsonLd",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      siteId,
      siteName,
      DEFAULT_SEO.defaultDescription ?? `${siteName} — built with MABPS.`,
      DEFAULT_SEO.ogImageMediaId,
      DEFAULT_SEO.twitterHandle,
      DEFAULT_SEO.robots,
      DEFAULT_SEO.canonicalBaseUrl,
      DEFAULT_SEO.jsonLd,
      timestamp,
      timestamp,
    );
  return getSeoBySiteId(siteId)!;
}

function insertPageWithSections(
  siteId: string,
  seed: DefaultPageSeed,
  timestamp: string,
): WebsitePage {
  const pageId = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_page" (
        "id", "siteId", "title", "slug", "pageType", "status", "sortOrder",
        "seoTitle", "seoDescription", "seoOgImageMediaId", "seoRobots",
        "publishedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, 'published', ?, NULL, NULL, NULL, NULL, ?, ?, ?)`,
    )
    .run(
      pageId,
      siteId,
      seed.title,
      seed.slug,
      seed.pageType,
      seed.sortOrder,
      timestamp,
      timestamp,
      timestamp,
    );

  const insertSection = sqlite.prepare(
    `INSERT INTO "website_section" (
      "id", "pageId", "type", "sortOrder", "content", "settings",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`,
  );

  seed.sections.forEach((section, index) => {
    insertSection.run(
      randomUUID(),
      pageId,
      section.type,
      index,
      JSON.stringify(section.content),
      timestamp,
      timestamp,
    );
  });

  return getPageById(pageId)!;
}

function seedDefaultNavigation(
  siteId: string,
  pages: WebsitePage[],
  timestamp: string,
): void {
  const insert = sqlite.prepare(
    `INSERT INTO "website_nav_item" (
      "id", "siteId", "label", "href", "pageId", "parentId", "sortOrder", "openInNewTab",
      "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, 0, ?, ?)`,
  );

  const order = ["home", "about", "products", "collections", "blog", "contact"];
  const bySlug = new Map(pages.map((page) => [page.slug, page]));

  order.forEach((slug, index) => {
    const page = bySlug.get(slug);
    if (!page) return;
    insert.run(
      randomUUID(),
      siteId,
      page.title,
      hrefForPage(page),
      page.id,
      index,
      timestamp,
      timestamp,
    );
  });
}

function seedContactForm(siteId: string, timestamp: string): WebsiteForm {
  const formId = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_form" (
        "id", "siteId", "name", "slug", "description", "successMessage",
        "notifyEmail", "status", "createdAt", "updatedAt"
      ) VALUES (?, ?, 'Contact', 'contact', 'Default contact form',
        'Thanks — we received your message and will reply soon.',
        NULL, 'active', ?, ?)`,
    )
    .run(formId, siteId, timestamp, timestamp);

  const fields: Array<{
    label: string;
    name: string;
    fieldType: FormFieldType;
    required: boolean;
    placeholder?: string;
  }> = [
    {
      label: "Name",
      name: "name",
      fieldType: "text",
      required: true,
      placeholder: "Your name",
    },
    {
      label: "Email",
      name: "email",
      fieldType: "email",
      required: true,
      placeholder: "you@example.com",
    },
    {
      label: "Message",
      name: "message",
      fieldType: "textarea",
      required: true,
      placeholder: "How can we help?",
    },
  ];

  const insertField = sqlite.prepare(
    `INSERT INTO "website_form_field" (
      "id", "formId", "label", "name", "fieldType", "placeholder", "required",
      "options", "sortOrder", "createdAt", "updatedAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
  );

  fields.forEach((field, index) => {
    insertField.run(
      randomUUID(),
      formId,
      field.label,
      field.name,
      field.fieldType,
      field.placeholder ?? null,
      field.required ? 1 : 0,
      index,
      timestamp,
      timestamp,
    );
  });

  return getFormById(formId)!;
}

export function createSite(input: {
  workspaceId: string;
  name: string;
  slug?: string;
  template?: SiteTemplateId | null;
  category?: SiteCategoryId | null;
}): WebsiteSite {
  ensureWebsiteReady();
  const timestamp = nowIso();
  const name = input.name.trim();
  if (!name) {
    throw new Error("Site name is required.");
  }

  const slug = ensureUniqueSlug(input.slug?.trim() || name, siteSlugExists);
  const id = randomUUID();

  const create = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO "website_site" (
          "id", "workspaceId", "name", "slug", "status", "customDomain",
          "domainVerified", "domainVerificationToken", "publishedAt",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, 'draft', NULL, 0, NULL, NULL, ?, ?)`,
      )
      .run(id, input.workspaceId, name, slug, timestamp, timestamp);

    insertTheme(id, timestamp);
    insertHeader(id, name, timestamp);
    insertFooter(id, name, timestamp);
    insertSeo(id, name, timestamp);

    const pages = buildTemplatePages({
      siteName: name,
      template: input.template,
      category: input.category,
    }).map((seed) => insertPageWithSections(id, seed, timestamp));
    seedDefaultNavigation(id, pages, timestamp);
    seedContactForm(id, timestamp);
  });

  create();
  return getSiteById(id)!;
}

export function updateSite(
  siteId: string,
  input: Partial<{
    name: string;
    slug: string;
    status: SiteStatus;
    customDomain: string | null;
    domainVerified: boolean;
    domainVerificationToken: string | null;
    publishedAt: string | null;
  }>,
): WebsiteSite {
  ensureWebsiteReady();
  const existing = getSiteById(siteId);
  if (!existing) {
    throw new Error("Site not found.");
  }

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidate = slugify(input.slug);
    if (!candidate) throw new Error("Invalid site slug.");
    if (candidate !== existing.slug && siteSlugExists(candidate)) {
      throw new Error("That site slug is already taken.");
    }
    nextSlug = candidate;
  }

  let nextDomain = existing.customDomain;
  if (input.customDomain !== undefined) {
    nextDomain = input.customDomain
      ? input.customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
      : null;
    if (nextDomain) {
      const taken = getSiteByCustomDomain(nextDomain);
      if (taken && taken.id !== siteId) {
        throw new Error("That custom domain is already in use.");
      }
    }
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_site" SET
        "name" = ?, "slug" = ?, "status" = ?, "customDomain" = ?,
        "domainVerified" = ?, "domainVerificationToken" = ?, "publishedAt" = ?,
        "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.name?.trim() || existing.name,
      nextSlug,
      input.status ?? existing.status,
      nextDomain,
      input.domainVerified === undefined
        ? existing.domainVerified
          ? 1
          : 0
        : input.domainVerified
          ? 1
          : 0,
      input.domainVerificationToken === undefined
        ? existing.domainVerificationToken
        : input.domainVerificationToken,
      input.publishedAt === undefined
        ? existing.publishedAt
        : input.publishedAt,
      timestamp,
      siteId,
    );

  return getSiteById(siteId)!;
}

function rowToPublishEvent(row: Record<string, unknown>): WebsitePublishEvent {
  return {
    id: String(row.id),
    siteId: String(row.siteId),
    action: row.action as PublishEventAction,
    status: row.status as SiteStatus,
    versionLabel: String(row.versionLabel),
    actorUserId: row.actorUserId ? String(row.actorUserId) : null,
    actorName: row.actorName ? String(row.actorName) : null,
    note: row.note ? String(row.note) : null,
    createdAt: String(row.createdAt),
  };
}

export function listPublishEvents(
  siteId: string,
  limit = 20,
): WebsitePublishEvent[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_publish_event"
       WHERE "siteId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(siteId, Math.max(1, Math.min(100, limit))) as Record<
    string,
    unknown
  >[];
  return rows.map(rowToPublishEvent);
}

export function countPublishEvents(siteId: string): number {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "website_publish_event" WHERE "siteId" = ?`,
    )
    .get(siteId) as { count?: number } | undefined;
  return Number(row?.count ?? 0);
}

export function recordPublishEvent(input: {
  siteId: string;
  action: PublishEventAction;
  status: SiteStatus;
  actorUserId?: string | null;
  actorName?: string | null;
  note?: string | null;
}): WebsitePublishEvent {
  ensureWebsiteReady();
  const timestamp = nowIso();
  const priorPublishes = sqlite
    .prepare(
      `SELECT COUNT(*) as count FROM "website_publish_event"
       WHERE "siteId" = ? AND "action" = 'publish'`,
    )
    .get(input.siteId) as { count?: number } | undefined;
  const nextPublishNumber = Number(priorPublishes?.count ?? 0) + 1;
  const versionLabel =
    input.action === "publish"
      ? `v${nextPublishNumber}`
      : `offline-${timestamp.slice(0, 10)}`;
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_publish_event" (
        "id", "siteId", "action", "status", "versionLabel",
        "actorUserId", "actorName", "note", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      input.action,
      input.status,
      versionLabel,
      input.actorUserId ?? null,
      input.actorName ?? null,
      input.note ?? null,
      timestamp,
    );
  return rowToPublishEvent(
    sqlite
      .prepare(`SELECT * FROM "website_publish_event" WHERE "id" = ?`)
      .get(id) as Record<string, unknown>,
  );
}

export function deleteSite(siteId: string): void {
  ensureWebsiteReady();
  sqlite.prepare(`DELETE FROM "website_site" WHERE "id" = ?`).run(siteId);
}

export function getThemeBySiteId(siteId: string): WebsiteTheme | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_theme" WHERE "siteId" = ?`)
    .get(siteId) as Record<string, unknown> | undefined;
  return row ? rowToTheme(row) : null;
}

export function updateTheme(
  siteId: string,
  input: Partial<Omit<WebsiteTheme, "id" | "siteId" | "createdAt" | "updatedAt">>,
): WebsiteTheme {
  ensureWebsiteReady();
  const existing = getThemeBySiteId(siteId);
  if (!existing) throw new Error("Theme not found.");

  const timestamp = nowIso();
  let tokens: ThemeTokens = existing.tokens;

  if (input.tokens) {
    tokens = normalizeThemeTokens(input.tokens, {
      primaryColor: existing.primaryColor,
      secondaryColor: existing.secondaryColor,
      backgroundColor: existing.backgroundColor,
      textColor: existing.textColor,
      mutedColor: existing.mutedColor,
      fontHeading: existing.fontHeading,
      fontBody: existing.fontBody,
      borderRadius: existing.borderRadius,
      buttonStyle: existing.buttonStyle,
      logoMediaId: existing.logoMediaId,
      faviconMediaId: existing.faviconMediaId,
    });
  } else {
    // Keep tokens in sync when legacy core fields are patched (wizard, old clients).
    const patched = { ...existing, ...input };
    tokens = normalizeThemeTokens(
      {
        ...existing.tokens,
        brand: {
          ...existing.tokens.brand,
          logoMediaId:
            input.logoMediaId !== undefined
              ? input.logoMediaId
              : existing.tokens.brand.logoMediaId,
          faviconMediaId:
            input.faviconMediaId !== undefined
              ? input.faviconMediaId
              : existing.tokens.brand.faviconMediaId,
        },
        colors: {
          ...existing.tokens.colors,
          primary: patched.primaryColor,
          secondary: patched.secondaryColor,
          background: patched.backgroundColor,
          textPrimary: patched.textColor,
          muted: patched.mutedColor,
        },
        typography: {
          ...existing.tokens.typography,
          headingFont: patched.fontHeading,
          bodyFont: patched.fontBody,
        },
        borders: {
          ...existing.tokens.borders,
          globalRadius: patched.borderRadius,
        },
        buttons: {
          ...existing.tokens.buttons,
          defaultVariant: patched.buttonStyle,
        },
        presetId: null,
      },
      {
        primaryColor: patched.primaryColor,
        secondaryColor: patched.secondaryColor,
        backgroundColor: patched.backgroundColor,
        textColor: patched.textColor,
        mutedColor: patched.mutedColor,
        fontHeading: patched.fontHeading,
        fontBody: patched.fontBody,
        borderRadius: patched.borderRadius,
        buttonStyle: patched.buttonStyle,
        logoMediaId: patched.logoMediaId,
        faviconMediaId: patched.faviconMediaId,
      },
    );
  }

  const core = coreFieldsFromTokens(tokens);
  const customCssRaw =
    input.customCss !== undefined ? input.customCss : existing.customCss;
  const customCss =
    customCssRaw === null || customCssRaw === undefined
      ? null
      : requireSafeCustomCss(customCssRaw);

  sqlite
    .prepare(
      `UPDATE "website_theme" SET
        "primaryColor" = ?, "secondaryColor" = ?, "backgroundColor" = ?,
        "textColor" = ?, "mutedColor" = ?, "fontHeading" = ?, "fontBody" = ?,
        "borderRadius" = ?, "buttonStyle" = ?, "logoMediaId" = ?,
        "faviconMediaId" = ?, "customCss" = ?, "tokens" = ?, "updatedAt" = ?
      WHERE "siteId" = ?`,
    )
    .run(
      core.primaryColor,
      core.secondaryColor,
      core.backgroundColor,
      core.textColor,
      core.mutedColor,
      core.fontHeading,
      core.fontBody,
      core.borderRadius,
      core.buttonStyle,
      core.logoMediaId,
      core.faviconMediaId,
      customCss,
      JSON.stringify(tokens),
      timestamp,
      siteId,
    );
  return getThemeBySiteId(siteId)!;
}

export function getHeaderBySiteId(siteId: string): WebsiteHeader | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_header" WHERE "siteId" = ?`)
    .get(siteId) as Record<string, unknown> | undefined;
  return row ? rowToHeader(row) : null;
}

export function updateHeader(
  siteId: string,
  input: Partial<Omit<WebsiteHeader, "id" | "siteId" | "createdAt" | "updatedAt">>,
): WebsiteHeader {
  ensureWebsiteReady();
  const existing = getHeaderBySiteId(siteId);
  if (!existing) throw new Error("Header not found.");
  const timestamp = nowIso();
  // Partial API/wizard payloads often include `ctaStyle: undefined`. Spreading that
  // would wipe the seeded value and fail the NOT NULL constraint on write.
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<typeof input>;
  const next = { ...existing, ...patch };
  const ctaStyle = isButtonStyle(next.ctaStyle)
    ? next.ctaStyle
    : DEFAULT_HEADER.ctaStyle;
  const uxExtras = JSON.stringify({
    logoSize: next.logoSize ?? "md",
    announcementText: next.announcementText ?? null,
    announcementEnabled: Boolean(next.announcementEnabled),
    showSearch: Boolean(next.showSearch),
    showCart: Boolean(next.showCart),
  });
  sqlite
    .prepare(
      `UPDATE "website_header" SET
        "logoText" = ?, "logoMediaId" = ?, "showLogo" = ?, "sticky" = ?,
        "backgroundColor" = ?, "textColor" = ?, "ctaLabel" = ?, "ctaHref" = ?,
        "ctaStyle" = ?, "uxExtras" = ?, "updatedAt" = ?
      WHERE "siteId" = ?`,
    )
    .run(
      next.logoText,
      next.logoMediaId,
      next.showLogo ? 1 : 0,
      next.sticky ? 1 : 0,
      next.backgroundColor,
      next.textColor,
      next.ctaLabel,
      next.ctaHref,
      ctaStyle,
      uxExtras,
      timestamp,
      siteId,
    );
  return getHeaderBySiteId(siteId)!;
}

export function getFooterBySiteId(siteId: string): WebsiteFooter | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_footer" WHERE "siteId" = ?`)
    .get(siteId) as Record<string, unknown> | undefined;
  return row ? rowToFooter(row) : null;
}

export function updateFooter(
  siteId: string,
  input: Partial<Omit<WebsiteFooter, "id" | "siteId" | "createdAt" | "updatedAt">>,
): WebsiteFooter {
  ensureWebsiteReady();
  const existing = getFooterBySiteId(siteId);
  if (!existing) throw new Error("Footer not found.");
  const timestamp = nowIso();
  const next = { ...existing, ...input };
  sqlite
    .prepare(
      `UPDATE "website_footer" SET
        "copyrightText" = ?, "showSocial" = ?, "socialLinks" = ?, "columns" = ?,
        "backgroundColor" = ?, "textColor" = ?, "updatedAt" = ?
      WHERE "siteId" = ?`,
    )
    .run(
      next.copyrightText,
      next.showSocial ? 1 : 0,
      JSON.stringify(next.socialLinks),
      JSON.stringify(next.columns),
      next.backgroundColor,
      next.textColor,
      timestamp,
      siteId,
    );
  return getFooterBySiteId(siteId)!;
}

export function listNavItems(siteId: string): WebsiteNavItem[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_nav_item" WHERE "siteId" = ? ORDER BY "sortOrder" ASC`,
    )
    .all(siteId) as Record<string, unknown>[];
  return rows.map(rowToNavItem);
}

export function replaceNavItems(
  siteId: string,
  items: Array<{
    clientKey?: string;
    label: string;
    href?: string | null;
    pageId?: string | null;
    parentKey?: string | null;
    openInNewTab?: boolean;
  }>,
): WebsiteNavItem[] {
  ensureWebsiteReady();
  const timestamp = nowIso();

  const run = sqlite.transaction(() => {
    sqlite
      .prepare(`DELETE FROM "website_nav_item" WHERE "siteId" = ?`)
      .run(siteId);

    const insert = sqlite.prepare(
      `INSERT INTO "website_nav_item" (
        "id", "siteId", "label", "href", "pageId", "parentId", "sortOrder",
        "openInNewTab", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const idByClientKey = new Map<string, string>();
    const prepared = items
      .map((item, index) => {
        const label = item.label.trim();
        if (!label) return null;
        const clientKey = item.clientKey?.trim() || `item-${index}`;
        const id = randomUUID();
        idByClientKey.set(clientKey, id);

        const page =
          item.pageId && typeof item.pageId === "string"
            ? getPageById(item.pageId)
            : null;
        const pageBelongs =
          page && page.siteId === siteId ? page : null;
        const href = pageBelongs
          ? hrefForPage(pageBelongs)
          : item.href?.trim() || null;

        return {
          id,
          clientKey,
          label,
          href,
          pageId: pageBelongs?.id ?? null,
          parentKey: item.parentKey?.trim() || null,
          openInNewTab: Boolean(item.openInNewTab),
          sortOrder: index,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    // Only allow one nesting level: children must reference a top-level sibling.
    const topLevelKeys = new Set(
      prepared
        .filter((item) => !item.parentKey)
        .map((item) => item.clientKey),
    );

    prepared.forEach((item) => {
      let parentId: string | null = null;
      if (item.parentKey && topLevelKeys.has(item.parentKey)) {
        parentId = idByClientKey.get(item.parentKey) ?? null;
      }
      // Prevent self-parenting and child-as-parent.
      if (parentId === item.id) parentId = null;

      insert.run(
        item.id,
        siteId,
        item.label,
        item.href,
        item.pageId,
        parentId,
        item.sortOrder,
        item.openInNewTab ? 1 : 0,
        timestamp,
        timestamp,
      );
    });
  });

  run();
  return listNavItems(siteId);
}

export function getSeoBySiteId(siteId: string): WebsiteSeo | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_seo" WHERE "siteId" = ?`)
    .get(siteId) as Record<string, unknown> | undefined;
  return row ? rowToSeo(row) : null;
}

export function updateSeo(
  siteId: string,
  input: Partial<Omit<WebsiteSeo, "id" | "siteId" | "createdAt" | "updatedAt">>,
): WebsiteSeo {
  ensureWebsiteReady();
  const existing = getSeoBySiteId(siteId);
  if (!existing) throw new Error("SEO settings not found.");
  const timestamp = nowIso();
  const next = { ...existing, ...input };
  const jsonLd =
    next.jsonLd === null || next.jsonLd === undefined
      ? null
      : requireSafeJsonLd(next.jsonLd);
  sqlite
    .prepare(
      `UPDATE "website_seo" SET
        "defaultTitle" = ?, "defaultDescription" = ?, "ogImageMediaId" = ?,
        "twitterHandle" = ?, "robots" = ?, "canonicalBaseUrl" = ?, "jsonLd" = ?,
        "updatedAt" = ?
      WHERE "siteId" = ?`,
    )
    .run(
      next.defaultTitle,
      next.defaultDescription,
      next.ogImageMediaId,
      next.twitterHandle,
      next.robots,
      next.canonicalBaseUrl,
      jsonLd,
      timestamp,
      siteId,
    );
  return getSeoBySiteId(siteId)!;
}

export function listPages(siteId: string): WebsitePage[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_page" WHERE "siteId" = ? ORDER BY "sortOrder" ASC, "createdAt" ASC`,
    )
    .all(siteId) as Record<string, unknown>[];
  return rows.map(rowToPage);
}

export function getPageById(pageId: string): WebsitePage | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_page" WHERE "id" = ?`)
    .get(pageId) as Record<string, unknown> | undefined;
  return row ? rowToPage(row) : null;
}

export function getPageBySlug(
  siteId: string,
  slug: string,
): WebsitePage | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "website_page" WHERE "siteId" = ? AND "slug" = ?`,
    )
    .get(siteId, slug) as Record<string, unknown> | undefined;
  return row ? rowToPage(row) : null;
}

export function createPage(input: {
  siteId: string;
  title: string;
  slug?: string;
  pageType?: PageType;
}): WebsitePage {
  ensureWebsiteReady();
  const title = input.title.trim();
  if (!title) throw new Error("Page title is required.");

  const slug = ensureUniqueSlug(input.slug?.trim() || title, (candidate) =>
    Boolean(getPageBySlug(input.siteId, candidate)),
  );

  const existing = listPages(input.siteId);
  const timestamp = nowIso();
  const id = randomUUID();

  sqlite
    .prepare(
      `INSERT INTO "website_page" (
        "id", "siteId", "title", "slug", "pageType", "status", "sortOrder",
        "seoTitle", "seoDescription", "seoOgImageMediaId", "seoRobots",
        "publishedAt", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      title,
      slug,
      input.pageType ?? "custom",
      existing.length,
      timestamp,
      timestamp,
    );

  sqlite
    .prepare(
      `INSERT INTO "website_section" (
        "id", "pageId", "type", "sortOrder", "content", "settings",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, 'richText', 0, ?, '{}', ?, ?)`,
    )
    .run(
      randomUUID(),
      id,
      JSON.stringify({
        html: `<p>Start building the ${title} page.</p>`,
      }),
      timestamp,
      timestamp,
    );

  return getPageById(id)!;
}

export function updatePage(
  pageId: string,
  input: Partial<{
    title: string;
    slug: string;
    status: PageStatus;
    sortOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    seoOgImageMediaId: string | null;
    seoRobots: string | null;
    publishedAt: string | null;
  }>,
): WebsitePage {
  ensureWebsiteReady();
  const existing = getPageById(pageId);
  if (!existing) throw new Error("Page not found.");

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidate = slugify(input.slug);
    if (!candidate) throw new Error("Invalid page slug.");
    const clash = getPageBySlug(existing.siteId, candidate);
    if (clash && clash.id !== pageId) {
      throw new Error("A page with that slug already exists.");
    }
    nextSlug = candidate;
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_page" SET
        "title" = ?, "slug" = ?, "status" = ?, "sortOrder" = ?,
        "seoTitle" = ?, "seoDescription" = ?, "seoOgImageMediaId" = ?,
        "seoRobots" = ?, "publishedAt" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.title?.trim() || existing.title,
      nextSlug,
      input.status ?? existing.status,
      input.sortOrder ?? existing.sortOrder,
      input.seoTitle === undefined ? existing.seoTitle : input.seoTitle,
      input.seoDescription === undefined
        ? existing.seoDescription
        : input.seoDescription,
      input.seoOgImageMediaId === undefined
        ? existing.seoOgImageMediaId
        : input.seoOgImageMediaId,
      input.seoRobots === undefined ? existing.seoRobots : input.seoRobots,
      input.publishedAt === undefined
        ? existing.publishedAt
        : input.publishedAt,
      timestamp,
      pageId,
    );

  return getPageById(pageId)!;
}

export function deletePage(pageId: string): void {
  ensureWebsiteReady();
  const page = getPageById(pageId);
  if (!page) throw new Error("Page not found.");
  if (page.pageType === "home") {
    throw new Error("The home page cannot be deleted.");
  }
  sqlite.prepare(`DELETE FROM "website_page" WHERE "id" = ?`).run(pageId);
}

export function listSections(pageId: string): WebsiteSection[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_section" WHERE "pageId" = ? ORDER BY "sortOrder" ASC`,
    )
    .all(pageId) as Record<string, unknown>[];
  return rows.map(rowToSection);
}

export function getSectionById(sectionId: string): WebsiteSection | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_section" WHERE "id" = ?`)
    .get(sectionId) as Record<string, unknown> | undefined;
  return row ? rowToSection(row) : null;
}

export function createSection(input: {
  pageId: string;
  type: SectionType;
  content?: Record<string, unknown>;
  settings?: SectionSettings;
  sortOrder?: number;
}): WebsiteSection {
  ensureWebsiteReady();
  const existing = listSections(input.pageId);
  const timestamp = nowIso();
  const id = randomUUID();
  const sortOrder =
    input.sortOrder === undefined ? existing.length : input.sortOrder;

  const content = sanitizeSectionContent(
    input.type,
    input.content ?? defaultSectionContent(input.type),
  );

  sqlite
    .prepare(
      `INSERT INTO "website_section" (
        "id", "pageId", "type", "sortOrder", "content", "settings",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.pageId,
      input.type,
      sortOrder,
      JSON.stringify(content),
      JSON.stringify(input.settings ?? {}),
      timestamp,
      timestamp,
    );

  return getSectionById(id)!;
}

export function updateSection(
  sectionId: string,
  input: Partial<{
    type: SectionType;
    content: Record<string, unknown>;
    settings: SectionSettings;
    sortOrder: number;
  }>,
): WebsiteSection {
  ensureWebsiteReady();
  const existing = getSectionById(sectionId);
  if (!existing) throw new Error("Section not found.");
  const timestamp = nowIso();
  const type = input.type ?? existing.type;
  const content = sanitizeSectionContent(
    type,
    input.content ?? existing.content,
  );
  sqlite
    .prepare(
      `UPDATE "website_section" SET
        "type" = ?, "sortOrder" = ?, "content" = ?, "settings" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      type,
      input.sortOrder ?? existing.sortOrder,
      JSON.stringify(content),
      JSON.stringify(input.settings ?? existing.settings),
      timestamp,
      sectionId,
    );
  return getSectionById(sectionId)!;
}

export function deleteSection(sectionId: string): void {
  ensureWebsiteReady();
  sqlite.prepare(`DELETE FROM "website_section" WHERE "id" = ?`).run(sectionId);
}

export function replaceSections(
  pageId: string,
  sections: Array<{
    id?: string;
    type: SectionType;
    content?: Record<string, unknown>;
    settings?: SectionSettings;
  }>,
): WebsiteSection[] {
  ensureWebsiteReady();
  const timestamp = nowIso();

  const run = sqlite.transaction(() => {
    sqlite
      .prepare(`DELETE FROM "website_section" WHERE "pageId" = ?`)
      .run(pageId);

    const insert = sqlite.prepare(
      `INSERT INTO "website_section" (
        "id", "pageId", "type", "sortOrder", "content", "settings",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    sections.forEach((section, index) => {
      const content = sanitizeSectionContent(
        section.type,
        section.content ?? defaultSectionContent(section.type),
      );
      insert.run(
        section.id || randomUUID(),
        pageId,
        section.type,
        index,
        JSON.stringify(content),
        JSON.stringify(section.settings ?? {}),
        timestamp,
        timestamp,
      );
    });
  });

  run();
  return listSections(pageId);
}

function defaultSectionContent(type: SectionType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        eyebrow: "",
        heading: "New section",
        subheading: "Describe this section.",
        primaryLabel: "Get started",
        primaryHref: "/contact",
        secondaryLabel: "Learn more",
        secondaryHref: "/about",
        align: "center",
        height: "lg",
        overlay: 45,
        animation: "rise",
        backgroundMediaId: null,
        mobileMediaId: null,
        desktopMediaId: null,
        backgroundVideoUrl: "",
      };
    case "richText":
      return { html: "<p>Write something here.</p>" };
    case "image":
      return { mediaId: null, alt: "", caption: "" };
    case "features":
      return {
        heading: "Features",
        items: [{ title: "Feature", description: "Description" }],
      };
    case "cta":
      return {
        heading: "Call to action",
        body: "Add supporting copy.",
        buttonLabel: "Learn more",
        buttonHref: "/",
      };
    case "products":
      return { heading: "Products", items: [] };
    case "collections":
      return { heading: "Collections", items: [] };
    case "form":
      return { formSlug: "contact", heading: "Contact form" };
    case "blogList":
      return { heading: "Latest posts", limit: 6 };
    case "gallery":
      return { heading: "Gallery", mediaIds: [] };
    case "spacer":
      return { height: "md" };
    default:
      return {};
  }
}

export function listBlogPosts(siteId: string): WebsiteBlogPost[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_blog_post" WHERE "siteId" = ? ORDER BY "createdAt" DESC`,
    )
    .all(siteId) as Record<string, unknown>[];
  return rows.map(rowToBlogPost);
}

export function listPublishedBlogPosts(
  siteId: string,
  limit = 50,
): WebsiteBlogPost[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_blog_post"
       WHERE "siteId" = ? AND "status" = 'published'
       ORDER BY COALESCE("publishedAt", "createdAt") DESC
       LIMIT ?`,
    )
    .all(siteId, limit) as Record<string, unknown>[];
  return rows.map(rowToBlogPost);
}

export function getBlogPostById(postId: string): WebsiteBlogPost | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_blog_post" WHERE "id" = ?`)
    .get(postId) as Record<string, unknown> | undefined;
  return row ? rowToBlogPost(row) : null;
}

export function getBlogPostBySlug(
  siteId: string,
  slug: string,
): WebsiteBlogPost | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "website_blog_post" WHERE "siteId" = ? AND "slug" = ?`,
    )
    .get(siteId, slug) as Record<string, unknown> | undefined;
  return row ? rowToBlogPost(row) : null;
}

export function createBlogPost(input: {
  siteId: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content?: string;
  authorName?: string | null;
}): WebsiteBlogPost {
  ensureWebsiteReady();
  const title = input.title.trim();
  if (!title) throw new Error("Post title is required.");
  const slug = ensureUniqueSlug(input.slug?.trim() || title, (candidate) =>
    Boolean(getBlogPostBySlug(input.siteId, candidate)),
  );
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_blog_post" (
        "id", "siteId", "title", "slug", "excerpt", "content", "coverMediaId",
        "authorName", "status", "seoTitle", "seoDescription", "publishedAt",
        "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'draft', NULL, NULL, NULL, ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      title,
      slug,
      input.excerpt?.trim() || null,
      input.content ?? "",
      input.authorName?.trim() || null,
      timestamp,
      timestamp,
    );
  return getBlogPostById(id)!;
}

export function updateBlogPost(
  postId: string,
  input: Partial<{
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
  }>,
): WebsiteBlogPost {
  ensureWebsiteReady();
  const existing = getBlogPostById(postId);
  if (!existing) throw new Error("Blog post not found.");

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidate = slugify(input.slug);
    if (!candidate) throw new Error("Invalid post slug.");
    const clash = getBlogPostBySlug(existing.siteId, candidate);
    if (clash && clash.id !== postId) {
      throw new Error("A post with that slug already exists.");
    }
    nextSlug = candidate;
  }

  let publishedAt = existing.publishedAt;
  let status = input.status ?? existing.status;
  if (status === "published" && !publishedAt) {
    publishedAt = nowIso();
  }
  if (input.publishedAt !== undefined) {
    publishedAt = input.publishedAt;
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_blog_post" SET
        "title" = ?, "slug" = ?, "excerpt" = ?, "content" = ?, "coverMediaId" = ?,
        "authorName" = ?, "status" = ?, "seoTitle" = ?, "seoDescription" = ?,
        "publishedAt" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.title?.trim() || existing.title,
      nextSlug,
      input.excerpt === undefined ? existing.excerpt : input.excerpt,
      input.content === undefined ? existing.content : input.content,
      input.coverMediaId === undefined
        ? existing.coverMediaId
        : input.coverMediaId,
      input.authorName === undefined ? existing.authorName : input.authorName,
      status,
      input.seoTitle === undefined ? existing.seoTitle : input.seoTitle,
      input.seoDescription === undefined
        ? existing.seoDescription
        : input.seoDescription,
      publishedAt,
      timestamp,
      postId,
    );

  return getBlogPostById(postId)!;
}

export function deleteBlogPost(postId: string): void {
  ensureWebsiteReady();
  sqlite.prepare(`DELETE FROM "website_blog_post" WHERE "id" = ?`).run(postId);
}

export function listMedia(
  siteId: string,
  query: MediaListQuery = {},
): WebsiteMedia[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_media" WHERE "siteId" = ? ORDER BY "createdAt" DESC`,
    )
    .all(siteId) as Record<string, unknown>[];
  let media = rows.map(rowToMedia);

  if (query.folderId === "unfiled") {
    media = media.filter((item) => !item.folderId);
  } else if (query.folderId) {
    media = media.filter((item) => item.folderId === query.folderId);
  }

  if (query.favorited) {
    media = media.filter((item) => item.favorited);
  }

  if (query.kind && query.kind !== "all") {
    media = media.filter(
      (item) => mediaKindFromMime(item.mimeType, item.originalName) === query.kind,
    );
  }

  if (query.q?.trim()) {
    const q = query.q.trim().toLowerCase();
    media = media.filter(
      (item) =>
        item.originalName.toLowerCase().includes(q) ||
        (item.alt || "").toLowerCase().includes(q) ||
        item.mimeType.toLowerCase().includes(q),
    );
  }

  const sort = query.sort ?? (query.recent === "used" ? "used" : "newest");
  media = [...media].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === "name") {
      return a.originalName.localeCompare(b.originalName);
    }
    if (sort === "size") {
      return b.sizeBytes - a.sizeBytes;
    }
    if (sort === "used" || query.recent === "used") {
      const aUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return bUsed - aUsed;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const offset = Math.max(0, query.offset ?? 0);
  const limit = query.limit && query.limit > 0 ? query.limit : undefined;
  if (limit != null) {
    return media.slice(offset, offset + limit);
  }
  if (offset > 0) {
    return media.slice(offset);
  }
  return media;
}

export function countMedia(siteId: string, query: MediaListQuery = {}): number {
  return listMedia(siteId, { ...query, limit: undefined, offset: undefined })
    .length;
}

export function getMediaById(mediaId: string): WebsiteMedia | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_media" WHERE "id" = ?`)
    .get(mediaId) as Record<string, unknown> | undefined;
  return row ? rowToMedia(row) : null;
}

export function sumWorkspaceMediaBytes(workspaceId: string): number {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT COALESCE(SUM("sizeBytes"), 0) as total FROM "website_media" WHERE "workspaceId" = ?`,
    )
    .get(workspaceId) as { total: number };
  return Number(row.total ?? 0);
}

export function createMedia(input: {
  workspaceId: string;
  siteId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  folderId?: string | null;
  uploadedByUserId?: string | null;
  uploadedByName?: string | null;
  variants?: MediaVariants;
}): WebsiteMedia {
  ensureWebsiteReady();
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_media" (
        "id", "workspaceId", "siteId", "filename", "originalName", "mimeType",
        "sizeBytes", "width", "height", "alt", "storagePath",
        "folderId", "favorited", "lastUsedAt", "uploadedByUserId", "uploadedByName",
        "variants", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, null, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.siteId,
      input.filename,
      input.originalName,
      input.mimeType,
      input.sizeBytes,
      input.width ?? null,
      input.height ?? null,
      input.alt ?? null,
      input.storagePath,
      input.folderId ?? null,
      input.uploadedByUserId ?? null,
      input.uploadedByName ?? null,
      JSON.stringify(input.variants ?? {}),
      timestamp,
      timestamp,
    );
  return getMediaById(id)!;
}

export function updateMedia(
  mediaId: string,
  input: Partial<{
    alt: string | null;
    originalName: string;
    folderId: string | null;
    favorited: boolean;
    lastUsedAt: string | null;
    width: number | null;
    height: number | null;
    sizeBytes: number;
    mimeType: string;
    filename: string;
    storagePath: string;
    variants: MediaVariants;
  }>,
): WebsiteMedia {
  ensureWebsiteReady();
  const existing = getMediaById(mediaId);
  if (!existing) throw new Error("Media not found.");
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_media" SET
        "alt" = ?,
        "originalName" = ?,
        "folderId" = ?,
        "favorited" = ?,
        "lastUsedAt" = ?,
        "width" = ?,
        "height" = ?,
        "sizeBytes" = ?,
        "mimeType" = ?,
        "filename" = ?,
        "storagePath" = ?,
        "variants" = ?,
        "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.alt === undefined ? existing.alt : input.alt,
      input.originalName === undefined
        ? existing.originalName
        : input.originalName,
      input.folderId === undefined ? existing.folderId : input.folderId,
      input.favorited === undefined
        ? existing.favorited
          ? 1
          : 0
        : input.favorited
          ? 1
          : 0,
      input.lastUsedAt === undefined ? existing.lastUsedAt : input.lastUsedAt,
      input.width === undefined ? existing.width : input.width,
      input.height === undefined ? existing.height : input.height,
      input.sizeBytes === undefined ? existing.sizeBytes : input.sizeBytes,
      input.mimeType === undefined ? existing.mimeType : input.mimeType,
      input.filename === undefined ? existing.filename : input.filename,
      input.storagePath === undefined
        ? existing.storagePath
        : input.storagePath,
      JSON.stringify(
        input.variants === undefined ? existing.variants : input.variants,
      ),
      timestamp,
      mediaId,
    );
  return getMediaById(mediaId)!;
}

export function markMediaUsed(mediaId: string): WebsiteMedia | null {
  const existing = getMediaById(mediaId);
  if (!existing) return null;
  return updateMedia(mediaId, { lastUsedAt: nowIso() });
}

export function deleteMedia(mediaId: string): WebsiteMedia {
  ensureWebsiteReady();
  const existing = getMediaById(mediaId);
  if (!existing) throw new Error("Media not found.");
  sqlite.prepare(`DELETE FROM "website_media" WHERE "id" = ?`).run(mediaId);
  return existing;
}

export function listMediaFolders(siteId: string): WebsiteMediaFolder[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_media_folder" WHERE "siteId" = ? ORDER BY "sortOrder" ASC, "name" ASC`,
    )
    .all(siteId) as Record<string, unknown>[];
  return rows.map(rowToMediaFolder);
}

export function getMediaFolderById(
  folderId: string,
): WebsiteMediaFolder | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_media_folder" WHERE "id" = ?`)
    .get(folderId) as Record<string, unknown> | undefined;
  return row ? rowToMediaFolder(row) : null;
}

export function createMediaFolder(input: {
  workspaceId: string;
  siteId: string;
  name: string;
  parentId?: string | null;
}): WebsiteMediaFolder {
  ensureWebsiteReady();
  const timestamp = nowIso();
  const id = randomUUID();
  const maxOrder = sqlite
    .prepare(
      `SELECT COALESCE(MAX("sortOrder"), 0) as maxOrder FROM "website_media_folder" WHERE "siteId" = ?`,
    )
    .get(input.siteId) as { maxOrder: number };
  sqlite
    .prepare(
      `INSERT INTO "website_media_folder" (
        "id", "workspaceId", "siteId", "name", "parentId", "sortOrder", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.workspaceId,
      input.siteId,
      input.name.trim(),
      input.parentId ?? null,
      Number(maxOrder.maxOrder ?? 0) + 1,
      timestamp,
      timestamp,
    );
  return getMediaFolderById(id)!;
}

export function updateMediaFolder(
  folderId: string,
  input: Partial<{ name: string; parentId: string | null; sortOrder: number }>,
): WebsiteMediaFolder {
  ensureWebsiteReady();
  const existing = getMediaFolderById(folderId);
  if (!existing) throw new Error("Folder not found.");
  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_media_folder" SET "name" = ?, "parentId" = ?, "sortOrder" = ?, "updatedAt" = ? WHERE "id" = ?`,
    )
    .run(
      input.name === undefined ? existing.name : input.name.trim(),
      input.parentId === undefined ? existing.parentId : input.parentId,
      input.sortOrder === undefined ? existing.sortOrder : input.sortOrder,
      timestamp,
      folderId,
    );
  return getMediaFolderById(folderId)!;
}

export function deleteMediaFolder(folderId: string): WebsiteMediaFolder {
  ensureWebsiteReady();
  const existing = getMediaFolderById(folderId);
  if (!existing) throw new Error("Folder not found.");
  sqlite
    .prepare(
      `UPDATE "website_media" SET "folderId" = null, "updatedAt" = ? WHERE "folderId" = ?`,
    )
    .run(nowIso(), folderId);
  sqlite
    .prepare(`DELETE FROM "website_media_folder" WHERE "id" = ?`)
    .run(folderId);
  return existing;
}

export function seedDefaultMediaFolders(
  workspaceId: string,
  siteId: string,
): WebsiteMediaFolder[] {
  const existing = listMediaFolders(siteId);
  if (existing.length > 0) return existing;
  const defaults = [
    "Logos",
    "Hero Images",
    "Products",
    "Blog",
    "Documents",
    "Videos",
    "Social Media",
  ];
  return defaults.map((name) =>
    createMediaFolder({ workspaceId, siteId, name }),
  );
}

export function mediaKind(media: WebsiteMedia): MediaKind {
  return mediaKindFromMime(media.mimeType, media.originalName);
}

export function listForms(siteId: string): WebsiteForm[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_form" WHERE "siteId" = ? ORDER BY "createdAt" ASC`,
    )
    .all(siteId) as Record<string, unknown>[];
  return rows.map(rowToForm);
}

export function getFormById(formId: string): WebsiteForm | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(`SELECT * FROM "website_form" WHERE "id" = ?`)
    .get(formId) as Record<string, unknown> | undefined;
  return row ? rowToForm(row) : null;
}

export function getFormBySlug(
  siteId: string,
  slug: string,
): WebsiteForm | null {
  ensureWebsiteReady();
  const row = sqlite
    .prepare(
      `SELECT * FROM "website_form" WHERE "siteId" = ? AND "slug" = ?`,
    )
    .get(siteId, slug) as Record<string, unknown> | undefined;
  return row ? rowToForm(row) : null;
}

export function listFormFields(formId: string): WebsiteFormField[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_form_field" WHERE "formId" = ? ORDER BY "sortOrder" ASC`,
    )
    .all(formId) as Record<string, unknown>[];
  return rows.map(rowToFormField);
}

export function getFormWithFields(
  formId: string,
): WebsiteFormWithFields | null {
  const form = getFormById(formId);
  if (!form) return null;
  return { ...form, fields: listFormFields(formId) };
}

export function createForm(input: {
  siteId: string;
  name: string;
  slug?: string;
  description?: string | null;
  successMessage?: string;
  notifyEmail?: string | null;
}): WebsiteForm {
  ensureWebsiteReady();
  const name = input.name.trim();
  if (!name) throw new Error("Form name is required.");
  const slug = ensureUniqueSlug(input.slug?.trim() || name, (candidate) =>
    Boolean(getFormBySlug(input.siteId, candidate)),
  );
  const timestamp = nowIso();
  const id = randomUUID();
  sqlite
    .prepare(
      `INSERT INTO "website_form" (
        "id", "siteId", "name", "slug", "description", "successMessage",
        "notifyEmail", "status", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(
      id,
      input.siteId,
      name,
      slug,
      input.description?.trim() || null,
      input.successMessage?.trim() ||
        "Thanks — we received your submission.",
      input.notifyEmail?.trim() || null,
      timestamp,
      timestamp,
    );
  return getFormById(id)!;
}

export function updateForm(
  formId: string,
  input: Partial<{
    name: string;
    slug: string;
    description: string | null;
    successMessage: string;
    notifyEmail: string | null;
    status: FormStatus;
  }>,
): WebsiteForm {
  ensureWebsiteReady();
  const existing = getFormById(formId);
  if (!existing) throw new Error("Form not found.");

  let nextSlug = existing.slug;
  if (input.slug !== undefined) {
    const candidate = slugify(input.slug);
    if (!candidate) throw new Error("Invalid form slug.");
    const clash = getFormBySlug(existing.siteId, candidate);
    if (clash && clash.id !== formId) {
      throw new Error("A form with that slug already exists.");
    }
    nextSlug = candidate;
  }

  const timestamp = nowIso();
  sqlite
    .prepare(
      `UPDATE "website_form" SET
        "name" = ?, "slug" = ?, "description" = ?, "successMessage" = ?,
        "notifyEmail" = ?, "status" = ?, "updatedAt" = ?
      WHERE "id" = ?`,
    )
    .run(
      input.name?.trim() || existing.name,
      nextSlug,
      input.description === undefined
        ? existing.description
        : input.description,
      input.successMessage?.trim() || existing.successMessage,
      input.notifyEmail === undefined
        ? existing.notifyEmail
        : input.notifyEmail,
      input.status ?? existing.status,
      timestamp,
      formId,
    );
  return getFormById(formId)!;
}

export function replaceFormFields(
  formId: string,
  fields: Array<{
    label: string;
    name: string;
    fieldType: FormFieldType;
    placeholder?: string | null;
    required?: boolean;
    options?: string[];
  }>,
): WebsiteFormField[] {
  ensureWebsiteReady();
  if (!getFormById(formId)) throw new Error("Form not found.");
  const timestamp = nowIso();

  const run = sqlite.transaction(() => {
    sqlite
      .prepare(`DELETE FROM "website_form_field" WHERE "formId" = ?`)
      .run(formId);

    const insert = sqlite.prepare(
      `INSERT INTO "website_form_field" (
        "id", "formId", "label", "name", "fieldType", "placeholder", "required",
        "options", "sortOrder", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    fields.forEach((field, index) => {
      const label = field.label.trim();
      const name = slugify(field.name || label).replace(/-/g, "_") || `field_${index}`;
      if (!label) return;
      insert.run(
        randomUUID(),
        formId,
        label,
        name,
        field.fieldType,
        field.placeholder ?? null,
        field.required ? 1 : 0,
        JSON.stringify(field.options ?? []),
        index,
        timestamp,
        timestamp,
      );
    });
  });

  run();
  return listFormFields(formId);
}

export function deleteForm(formId: string): void {
  ensureWebsiteReady();
  sqlite.prepare(`DELETE FROM "website_form" WHERE "id" = ?`).run(formId);
}

export function createFormSubmission(input: {
  formId: string;
  siteId: string;
  payload: Record<string, unknown>;
  sourceUrl?: string | null;
  ipHash?: string | null;
}): WebsiteFormSubmission {
  ensureWebsiteReady();
  const id = randomUUID();
  const timestamp = nowIso();
  sqlite
    .prepare(
      `INSERT INTO "website_form_submission" (
        "id", "formId", "siteId", "payload", "sourceUrl", "ipHash", "createdAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.formId,
      input.siteId,
      JSON.stringify(input.payload),
      input.sourceUrl ?? null,
      input.ipHash ?? null,
      timestamp,
    );
  const row = sqlite
    .prepare(`SELECT * FROM "website_form_submission" WHERE "id" = ?`)
    .get(id) as Record<string, unknown>;
  return rowToSubmission(row);
}

export function listFormSubmissions(
  formId: string,
  limit = 100,
): WebsiteFormSubmission[] {
  ensureWebsiteReady();
  const rows = sqlite
    .prepare(
      `SELECT * FROM "website_form_submission"
       WHERE "formId" = ?
       ORDER BY "createdAt" DESC
       LIMIT ?`,
    )
    .all(formId, limit) as Record<string, unknown>[];
  return rows.map(rowToSubmission);
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function generateDomainVerificationToken(): string {
  return `mabps-verify=${randomBytes(16).toString("hex")}`;
}

export function getSiteBundle(siteId: string) {
  ensureWebsiteReady();
  const site = getSiteById(siteId);
  if (!site) return null;
  return {
    site,
    theme: getThemeBySiteId(siteId)!,
    header: getHeaderBySiteId(siteId)!,
    footer: getFooterBySiteId(siteId)!,
    navigation: listNavItems(siteId),
    seo: getSeoBySiteId(siteId)!,
    pages: listPages(siteId),
  };
}
