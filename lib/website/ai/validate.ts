/**
 * Structural validators for AI Website Generator blueprints.
 *
 * C1 scope: type guards + parse of unknown JSON shapes.
 * Full clamp / sanitize / template fallback lands in C4.
 */

import {
  isSiteCategoryId,
  isSiteTemplateId,
} from "@/lib/website/templates";
import {
  isButtonStyle,
  isPageType,
  isSectionType,
  type FooterColumn,
  type FooterSocialLink,
  type PageType,
  type SectionSettings,
  type SectionType,
} from "@/lib/website/types";
import {
  AI_GENERATION_STATUSES,
  AI_GENERATION_TONES,
  AI_WEBSITE_BLUEPRINT_VERSION,
  type AiBusinessProfile,
  type AiGeneratedFooter,
  type AiGeneratedHeader,
  type AiGeneratedNavItem,
  type AiGeneratedPage,
  type AiGeneratedSection,
  type AiGeneratedSeo,
  type AiGeneratedSiteMeta,
  type AiGeneratedTheme,
  type AiGenerationIntent,
  type AiGenerationStatus,
  type AiGenerationTone,
  type AiThemeTokenPatch,
  type AiWebsiteBlueprint,
} from "@/lib/website/ai/types";

export type AiBlueprintValidationIssue = {
  path: string;
  message: string;
};

export type AiBlueprintParseResult =
  | { ok: true; blueprint: AiWebsiteBlueprint }
  | { ok: false; issues: AiBlueprintValidationIssue[] };

export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAiGenerationTone(value: unknown): value is AiGenerationTone {
  return (
    typeof value === "string" &&
    (AI_GENERATION_TONES as readonly string[]).includes(value)
  );
}

export function isAiGenerationStatus(
  value: unknown,
): value is AiGenerationStatus {
  return (
    typeof value === "string" &&
    (AI_GENERATION_STATUSES as readonly string[]).includes(value)
  );
}

function issue(
  path: string,
  message: string,
): AiBlueprintValidationIssue {
  return { path, message };
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseSectionSettings(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): SectionSettings | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) {
    issues.push(issue(path, "settings must be an object."));
    return undefined;
  }
  return value as SectionSettings;
}

function parseSection(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedSection | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "section must be an object."));
    return null;
  }
  if (!isSectionType(value.type)) {
    issues.push(issue(`${path}.type`, "invalid section type."));
    return null;
  }
  const type = value.type as SectionType;
  const content = isPlainObject(value.content) ? value.content : {};
  if (value.content !== undefined && !isPlainObject(value.content)) {
    issues.push(issue(`${path}.content`, "content must be an object."));
  }
  return {
    type,
    content,
    settings: parseSectionSettings(value.settings, `${path}.settings`, issues),
  };
}

function parsePage(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedPage | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "page must be an object."));
    return null;
  }
  if (!isPageType(value.pageType)) {
    issues.push(issue(`${path}.pageType`, "invalid page type."));
    return null;
  }
  const title = asString(value.title).trim();
  const slug = asString(value.slug).trim();
  if (!title) issues.push(issue(`${path}.title`, "title is required."));
  if (!slug) issues.push(issue(`${path}.slug`, "slug is required."));

  if (!Array.isArray(value.sections)) {
    issues.push(issue(`${path}.sections`, "sections array is required."));
    return null;
  }

  const sections: AiGeneratedSection[] = [];
  for (let i = 0; i < value.sections.length; i += 1) {
    const section = parseSection(
      value.sections[i],
      `${path}.sections[${i}]`,
      issues,
    );
    if (section) sections.push(section);
  }

  return {
    title,
    slug,
    pageType: value.pageType as PageType,
    seoTitle: asNullableString(value.seoTitle),
    seoDescription: asNullableString(value.seoDescription),
    sections,
  };
}

function parseSocialLink(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): FooterSocialLink | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "social link must be an object."));
    return null;
  }
  const label = asString(value.label).trim();
  const href = asString(value.href).trim();
  if (!label || !href) {
    issues.push(issue(path, "social link requires label and href."));
    return null;
  }
  return { label, href };
}

function parseFooterColumn(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): FooterColumn | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "footer column must be an object."));
    return null;
  }
  const title = asString(value.title).trim();
  if (!title) {
    issues.push(issue(`${path}.title`, "column title is required."));
    return null;
  }
  const linksRaw = Array.isArray(value.links) ? value.links : [];
  const links: Array<{ label: string; href: string }> = [];
  for (let i = 0; i < linksRaw.length; i += 1) {
    const link = linksRaw[i];
    if (!isPlainObject(link)) {
      issues.push(issue(`${path}.links[${i}]`, "link must be an object."));
      continue;
    }
    const label = asString(link.label).trim();
    const href = asString(link.href).trim();
    if (!label || !href) {
      issues.push(
        issue(`${path}.links[${i}]`, "link requires label and href."),
      );
      continue;
    }
    links.push({ label, href });
  }
  return { title, links };
}

function parseNavItem(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedNavItem | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "nav item must be an object."));
    return null;
  }
  const label = asString(value.label).trim();
  if (!label) {
    issues.push(issue(`${path}.label`, "label is required."));
    return null;
  }

  let pageType: PageType | null = null;
  if (value.pageType !== undefined && value.pageType !== null) {
    if (!isPageType(value.pageType)) {
      issues.push(issue(`${path}.pageType`, "invalid page type."));
    } else {
      pageType = value.pageType;
    }
  }

  const children: AiGeneratedNavItem[] = [];
  if (value.children !== undefined) {
    if (!Array.isArray(value.children)) {
      issues.push(issue(`${path}.children`, "children must be an array."));
    } else {
      for (let i = 0; i < value.children.length; i += 1) {
        const child = parseNavItem(
          value.children[i],
          `${path}.children[${i}]`,
          issues,
        );
        if (child) children.push(child);
      }
    }
  }

  return {
    label,
    pageSlug: asNullableString(value.pageSlug),
    pageType,
    href: asNullableString(value.href),
    openInNewTab: asBoolean(value.openInNewTab, false),
    ...(children.length > 0 ? { children } : {}),
  };
}

function parseIntent(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGenerationIntent | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "intent must be an object."));
    return null;
  }
  if (!isSiteCategoryId(value.category)) {
    issues.push(issue(`${path}.category`, "invalid site category."));
  }
  if (!isSiteTemplateId(value.template)) {
    issues.push(issue(`${path}.template`, "invalid site template."));
  }
  if (!isAiGenerationTone(value.tone)) {
    issues.push(issue(`${path}.tone`, "invalid tone."));
  }

  const requestedPageTypes: PageType[] = [];
  if (value.requestedPageTypes !== undefined) {
    if (!Array.isArray(value.requestedPageTypes)) {
      issues.push(
        issue(`${path}.requestedPageTypes`, "must be an array of page types."),
      );
    } else {
      for (let i = 0; i < value.requestedPageTypes.length; i += 1) {
        const pageType = value.requestedPageTypes[i];
        if (!isPageType(pageType)) {
          issues.push(
            issue(
              `${path}.requestedPageTypes[${i}]`,
              "invalid page type.",
            ),
          );
          continue;
        }
        requestedPageTypes.push(pageType);
      }
    }
  }

  if (
    !isSiteCategoryId(value.category) ||
    !isSiteTemplateId(value.template) ||
    !isAiGenerationTone(value.tone)
  ) {
    return null;
  }

  return {
    prompt: asString(value.prompt),
    locale: asString(value.locale, "en") || "en",
    category: value.category,
    template: value.template,
    tone: value.tone,
    businessName: asNullableString(value.businessName),
    industry: asNullableString(value.industry),
    requestedPageTypes,
  };
}

function parseBrand(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiBusinessProfile | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "brand must be an object."));
    return null;
  }
  const name = asString(value.name).trim();
  if (!name) {
    issues.push(issue(`${path}.name`, "name is required."));
    return null;
  }
  return {
    name,
    description: asString(value.description),
    slogan: asNullableString(value.slogan),
    industry: asNullableString(value.industry),
    locale: asString(value.locale, "en") || "en",
    audience: asNullableString(value.audience),
  };
}

function parseTheme(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedTheme | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "theme must be an object."));
    return null;
  }

  const tokens: AiThemeTokenPatch = {};
  if (value.tokens !== undefined && value.tokens !== null) {
    if (!isPlainObject(value.tokens)) {
      issues.push(issue(`${path}.tokens`, "tokens must be an object."));
    } else {
      if (value.tokens.brand !== undefined) {
        if (!isPlainObject(value.tokens.brand)) {
          issues.push(issue(`${path}.tokens.brand`, "must be an object."));
        } else {
          tokens.brand = value.tokens.brand as AiThemeTokenPatch["brand"];
        }
      }
      if (value.tokens.colors !== undefined) {
        if (!isPlainObject(value.tokens.colors)) {
          issues.push(issue(`${path}.tokens.colors`, "must be an object."));
        } else {
          tokens.colors = value.tokens.colors as AiThemeTokenPatch["colors"];
        }
      }
      if (value.tokens.typography !== undefined) {
        if (!isPlainObject(value.tokens.typography)) {
          issues.push(
            issue(`${path}.tokens.typography`, "must be an object."),
          );
        } else {
          tokens.typography = value.tokens
            .typography as AiThemeTokenPatch["typography"];
        }
      }
    }
  }

  return {
    presetId: asNullableString(value.presetId),
    tokens,
  };
}

function parseHeader(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedHeader | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "header must be an object."));
    return null;
  }
  const ctaStyleRaw = value.ctaStyle;
  const ctaStyle = isButtonStyle(ctaStyleRaw) ? ctaStyleRaw : "primary";
  if (ctaStyleRaw !== undefined && !isButtonStyle(ctaStyleRaw)) {
    issues.push(issue(`${path}.ctaStyle`, "invalid button style."));
  }
  return {
    logoText: asNullableString(value.logoText),
    showLogo: asBoolean(value.showLogo, true),
    sticky: asBoolean(value.sticky, true),
    ctaLabel: asNullableString(value.ctaLabel),
    ctaHref: asNullableString(value.ctaHref),
    ctaStyle,
    announcementText: asNullableString(value.announcementText),
    announcementEnabled: asBoolean(value.announcementEnabled, false),
  };
}

function parseFooter(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedFooter | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "footer must be an object."));
    return null;
  }

  const socialLinks: FooterSocialLink[] = [];
  if (value.socialLinks !== undefined) {
    if (!Array.isArray(value.socialLinks)) {
      issues.push(issue(`${path}.socialLinks`, "must be an array."));
    } else {
      for (let i = 0; i < value.socialLinks.length; i += 1) {
        const link = parseSocialLink(
          value.socialLinks[i],
          `${path}.socialLinks[${i}]`,
          issues,
        );
        if (link) socialLinks.push(link);
      }
    }
  }

  const columns: FooterColumn[] = [];
  if (value.columns !== undefined) {
    if (!Array.isArray(value.columns)) {
      issues.push(issue(`${path}.columns`, "must be an array."));
    } else {
      for (let i = 0; i < value.columns.length; i += 1) {
        const column = parseFooterColumn(
          value.columns[i],
          `${path}.columns[${i}]`,
          issues,
        );
        if (column) columns.push(column);
      }
    }
  }

  return {
    copyrightText: asNullableString(value.copyrightText),
    showSocial: asBoolean(value.showSocial, false),
    socialLinks,
    columns,
  };
}

function parseSeo(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedSeo | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "seo must be an object."));
    return null;
  }
  return {
    defaultTitle: asNullableString(value.defaultTitle),
    defaultDescription: asNullableString(value.defaultDescription),
    robots: asString(value.robots, "index,follow") || "index,follow",
    twitterHandle: asNullableString(value.twitterHandle),
  };
}

function parseSiteMeta(
  value: unknown,
  path: string,
  issues: AiBlueprintValidationIssue[],
): AiGeneratedSiteMeta | null {
  if (!isPlainObject(value)) {
    issues.push(issue(path, "site must be an object."));
    return null;
  }
  const name = asString(value.name).trim();
  if (!name) {
    issues.push(issue(`${path}.name`, "name is required."));
    return null;
  }
  return {
    name,
    slug: asNullableString(value.slug),
  };
}

/**
 * Parse unknown JSON into AiWebsiteBlueprint.
 * Returns issues for invalid shape; does not sanitize HTML or clamp lengths (C4).
 */
export function parseAiWebsiteBlueprint(
  value: unknown,
): AiBlueprintParseResult {
  const issues: AiBlueprintValidationIssue[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      issues: [issue("", "blueprint must be an object.")],
    };
  }

  if (value.version !== AI_WEBSITE_BLUEPRINT_VERSION) {
    issues.push(
      issue(
        "version",
        `version must be ${AI_WEBSITE_BLUEPRINT_VERSION}.`,
      ),
    );
  }

  const intent = parseIntent(value.intent, "intent", issues);
  const site = parseSiteMeta(value.site, "site", issues);
  const brand = parseBrand(value.brand, "brand", issues);
  const theme = parseTheme(value.theme, "theme", issues);
  const header = parseHeader(value.header, "header", issues);
  const footer = parseFooter(value.footer, "footer", issues);
  const seo = parseSeo(value.seo, "seo", issues);

  if (!Array.isArray(value.pages)) {
    issues.push(issue("pages", "pages array is required."));
  }
  if (!Array.isArray(value.navigation)) {
    issues.push(issue("navigation", "navigation array is required."));
  }

  const pages: AiGeneratedPage[] = [];
  if (Array.isArray(value.pages)) {
    for (let i = 0; i < value.pages.length; i += 1) {
      const page = parsePage(value.pages[i], `pages[${i}]`, issues);
      if (page) pages.push(page);
    }
  }

  const navigation: AiGeneratedNavItem[] = [];
  if (Array.isArray(value.navigation)) {
    for (let i = 0; i < value.navigation.length; i += 1) {
      const item = parseNavItem(
        value.navigation[i],
        `navigation[${i}]`,
        issues,
      );
      if (item) navigation.push(item);
    }
  }

  if (
    issues.length > 0 ||
    !intent ||
    !site ||
    !brand ||
    !theme ||
    !header ||
    !footer ||
    !seo
  ) {
    return { ok: false, issues };
  }

  if (pages.length === 0) {
    return {
      ok: false,
      issues: [issue("pages", "at least one page is required.")],
    };
  }

  const blueprint: AiWebsiteBlueprint = {
    version: AI_WEBSITE_BLUEPRINT_VERSION,
    intent,
    site,
    brand,
    theme,
    header,
    footer,
    seo,
    pages,
    navigation,
  };

  return { ok: true, blueprint };
}

export function isAiWebsiteBlueprint(
  value: unknown,
): value is AiWebsiteBlueprint {
  return parseAiWebsiteBlueprint(value).ok;
}

export function assertAiWebsiteBlueprint(
  value: unknown,
): AiWebsiteBlueprint {
  const result = parseAiWebsiteBlueprint(value);
  if (!result.ok) {
    const summary = result.issues
      .slice(0, 5)
      .map((item) => `${item.path || "(root)"}: ${item.message}`)
      .join("; ");
    throw new Error(`Invalid AiWebsiteBlueprint — ${summary}`);
  }
  return result.blueprint;
}
