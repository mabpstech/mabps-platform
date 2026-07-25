-- MABPS Website Builder schema.
-- Workspace id = organization.id from Better Auth.

CREATE TABLE IF NOT EXISTS "website_site" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null unique,
  "status" text not null default 'draft',
  "customDomain" text unique,
  "domainVerified" integer not null default 0,
  "domainVerificationToken" text,
  "publishedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_theme" (
  "id" text not null primary key,
  "siteId" text not null unique references "website_site" ("id") on delete cascade,
  "primaryColor" text not null,
  "secondaryColor" text not null,
  "backgroundColor" text not null,
  "textColor" text not null,
  "mutedColor" text not null,
  "fontHeading" text not null,
  "fontBody" text not null,
  "borderRadius" text not null,
  "buttonStyle" text not null,
  "logoMediaId" text,
  "faviconMediaId" text,
  "customCss" text,
  "tokens" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_header" (
  "id" text not null primary key,
  "siteId" text not null unique references "website_site" ("id") on delete cascade,
  "logoText" text,
  "logoMediaId" text,
  "showLogo" integer not null default 1,
  "sticky" integer not null default 1,
  "backgroundColor" text,
  "textColor" text,
  "ctaLabel" text,
  "ctaHref" text,
  "ctaStyle" text not null default 'primary',
  "uxExtras" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_footer" (
  "id" text not null primary key,
  "siteId" text not null unique references "website_site" ("id") on delete cascade,
  "copyrightText" text,
  "showSocial" integer not null default 0,
  "socialLinks" text not null default '[]',
  "columns" text not null default '[]',
  "backgroundColor" text,
  "textColor" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_nav_item" (
  "id" text not null primary key,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "label" text not null,
  "href" text,
  "pageId" text,
  "sortOrder" integer not null default 0,
  "openInNewTab" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_seo" (
  "id" text not null primary key,
  "siteId" text not null unique references "website_site" ("id") on delete cascade,
  "defaultTitle" text,
  "defaultDescription" text,
  "ogImageMediaId" text,
  "twitterHandle" text,
  "robots" text not null default 'index,follow',
  "canonicalBaseUrl" text,
  "jsonLd" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_page" (
  "id" text not null primary key,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "title" text not null,
  "slug" text not null,
  "pageType" text not null,
  "status" text not null default 'draft',
  "sortOrder" integer not null default 0,
  "seoTitle" text,
  "seoDescription" text,
  "seoOgImageMediaId" text,
  "seoRobots" text,
  "publishedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  unique ("siteId", "slug")
);

CREATE TABLE IF NOT EXISTS "website_section" (
  "id" text not null primary key,
  "pageId" text not null references "website_page" ("id") on delete cascade,
  "type" text not null,
  "sortOrder" integer not null default 0,
  "content" text not null default '{}',
  "settings" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_blog_post" (
  "id" text not null primary key,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "title" text not null,
  "slug" text not null,
  "excerpt" text,
  "content" text not null default '',
  "coverMediaId" text,
  "authorName" text,
  "status" text not null default 'draft',
  "seoTitle" text,
  "seoDescription" text,
  "publishedAt" text,
  "createdAt" text not null,
  "updatedAt" text not null,
  unique ("siteId", "slug")
);

CREATE TABLE IF NOT EXISTS "website_media_folder" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "name" text not null,
  "parentId" text,
  "sortOrder" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_media" (
  "id" text not null primary key,
  "workspaceId" text not null references "organization" ("id") on delete cascade,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "filename" text not null,
  "originalName" text not null,
  "mimeType" text not null,
  "sizeBytes" integer not null default 0,
  "width" integer,
  "height" integer,
  "alt" text,
  "storagePath" text not null,
  "folderId" text,
  "favorited" integer not null default 0,
  "lastUsedAt" text,
  "uploadedByUserId" text,
  "uploadedByName" text,
  "variants" text not null default '{}',
  "createdAt" text not null,
  "updatedAt" text not null
);

-- Opaque blob bytes for website media (Turso / SQLite). Keys match storagePath.
CREATE TABLE IF NOT EXISTS "media_blob" (
  "key" text not null primary key,
  "contentType" text not null default 'application/octet-stream',
  "bytes" blob not null,
  "sizeBytes" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_form" (
  "id" text not null primary key,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "name" text not null,
  "slug" text not null,
  "description" text,
  "successMessage" text not null default 'Thanks — we received your submission.',
  "notifyEmail" text,
  "status" text not null default 'active',
  "createdAt" text not null,
  "updatedAt" text not null,
  unique ("siteId", "slug")
);

CREATE TABLE IF NOT EXISTS "website_form_field" (
  "id" text not null primary key,
  "formId" text not null references "website_form" ("id") on delete cascade,
  "label" text not null,
  "name" text not null,
  "fieldType" text not null,
  "placeholder" text,
  "required" integer not null default 0,
  "options" text not null default '[]',
  "sortOrder" integer not null default 0,
  "createdAt" text not null,
  "updatedAt" text not null
);

CREATE TABLE IF NOT EXISTS "website_form_submission" (
  "id" text not null primary key,
  "formId" text not null references "website_form" ("id") on delete cascade,
  "siteId" text not null references "website_site" ("id") on delete cascade,
  "payload" text not null default '{}',
  "sourceUrl" text,
  "ipHash" text,
  "createdAt" text not null
);

CREATE INDEX IF NOT EXISTS "website_site_workspaceId_idx" on "website_site" ("workspaceId");
CREATE INDEX IF NOT EXISTS "website_site_status_idx" on "website_site" ("status");
CREATE INDEX IF NOT EXISTS "website_site_customDomain_idx" on "website_site" ("customDomain");
CREATE INDEX IF NOT EXISTS "website_page_siteId_idx" on "website_page" ("siteId");
CREATE INDEX IF NOT EXISTS "website_section_pageId_idx" on "website_section" ("pageId");
CREATE INDEX IF NOT EXISTS "website_nav_item_siteId_idx" on "website_nav_item" ("siteId");
CREATE INDEX IF NOT EXISTS "website_blog_post_siteId_idx" on "website_blog_post" ("siteId");
CREATE INDEX IF NOT EXISTS "website_media_siteId_idx" on "website_media" ("siteId");
CREATE INDEX IF NOT EXISTS "website_media_workspaceId_idx" on "website_media" ("workspaceId");
CREATE INDEX IF NOT EXISTS "website_media_folderId_idx" on "website_media" ("folderId");
CREATE INDEX IF NOT EXISTS "website_media_favorited_idx" on "website_media" ("siteId", "favorited");
CREATE INDEX IF NOT EXISTS "website_media_folder_siteId_idx" on "website_media_folder" ("siteId");
CREATE INDEX IF NOT EXISTS "website_form_siteId_idx" on "website_form" ("siteId");
CREATE INDEX IF NOT EXISTS "website_form_field_formId_idx" on "website_form_field" ("formId");
CREATE INDEX IF NOT EXISTS "website_form_submission_formId_idx" on "website_form_submission" ("formId");
