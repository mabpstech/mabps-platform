/**
 * Blueprint Executor engine (Sprint B1).
 *
 * Persists an AiWebsiteBlueprint into the Website Builder graph using existing
 * createWorkspaceSite / repository helpers — no duplicated SQL, no LLM.
 * The whole apply runs inside one sqlite.transaction (nested repo txns use SAVEPOINTs).
 */

import { sqlite } from "@/lib/db";
import type {
  AiBlueprintExecuteInput,
  AiBlueprintExecuteResult,
} from "@/lib/website/ai/blueprint-executor/types";
import {
  ensureHomePageFirst,
  resolveNavHref,
} from "@/lib/website/ai/helpers";
import type {
  AiGeneratedNavItem,
  AiGeneratedPage,
  AiGeneratedTheme,
  AiWebsiteBlueprint,
} from "@/lib/website/ai/types";
import { assertAiWebsiteBlueprint } from "@/lib/website/ai/validate";
import {
  createPage,
  deletePage,
  getFooterBySiteId,
  getHeaderBySiteId,
  getPageById,
  getSeoBySiteId,
  getSiteBundle,
  getThemeBySiteId,
  listNavItems,
  listPages,
  listSections,
  replaceNavItems,
  replaceSections,
  updateFooter,
  updateHeader,
  updatePage,
  updateSeo,
  updateTheme,
} from "@/lib/website/repository";
import { createWorkspaceSite } from "@/lib/website/sites";
import {
  coreFieldsFromTokens,
  getThemePreset,
  normalizeThemeTokens,
} from "@/lib/website/theme";
import type { ThemeTokens } from "@/lib/website/theme/types";
import type {
  WebsitePage,
  WebsiteSection,
} from "@/lib/website/types";
import type { SiteCategoryId } from "@/lib/website/templates";

function requireHomePage(pages: AiGeneratedPage[]): AiGeneratedPage {
  const home = pages.find((page) => page.pageType === "home");
  if (!home) {
    throw new Error("Blueprint must include a home page.");
  }
  return home;
}

function resolveThemeTokens(
  blueprint: AiWebsiteBlueprint,
  existing: ThemeTokens,
): ThemeTokens {
  const theme: AiGeneratedTheme = blueprint.theme;
  const preset = theme.presetId ? getThemePreset(theme.presetId) : undefined;
  const base = structuredClone(preset?.tokens ?? existing);
  const patch = theme.tokens;

  const merged: ThemeTokens = {
    ...base,
    presetId: theme.presetId ?? base.presetId,
    brand: {
      ...base.brand,
      ...(patch.brand ?? {}),
      businessName:
        patch.brand?.businessName !== undefined
          ? patch.brand.businessName
          : blueprint.brand.name,
      slogan:
        patch.brand?.slogan !== undefined
          ? patch.brand.slogan
          : blueprint.brand.slogan,
    },
    colors: {
      ...base.colors,
      ...(patch.colors ?? {}),
    },
    typography: {
      ...base.typography,
      ...(patch.typography ?? {}),
    },
  };

  return normalizeThemeTokens(merged, coreFieldsFromTokens(base));
}

function applyTheme(siteId: string, blueprint: AiWebsiteBlueprint): void {
  const existing = getThemeBySiteId(siteId);
  if (!existing) throw new Error("Theme not found.");
  updateTheme(siteId, {
    tokens: resolveThemeTokens(blueprint, existing.tokens),
  });
}

function applyHeader(siteId: string, blueprint: AiWebsiteBlueprint): void {
  const existing = getHeaderBySiteId(siteId);
  if (!existing) throw new Error("Header not found.");
  const header = blueprint.header;
  updateHeader(siteId, {
    logoText: header.logoText,
    showLogo: header.showLogo,
    sticky: header.sticky,
    ctaLabel: header.ctaLabel,
    ctaHref: header.ctaHref,
    ctaStyle: header.ctaStyle,
    announcementText: header.announcementText ?? null,
    announcementEnabled: Boolean(header.announcementEnabled),
  });
}

function applyFooter(siteId: string, blueprint: AiWebsiteBlueprint): void {
  const existing = getFooterBySiteId(siteId);
  if (!existing) throw new Error("Footer not found.");
  const footer = blueprint.footer;
  updateFooter(siteId, {
    copyrightText: footer.copyrightText,
    showSocial: footer.showSocial,
    socialLinks: footer.socialLinks,
    columns: footer.columns,
  });
}

function applySeo(siteId: string, blueprint: AiWebsiteBlueprint): void {
  const existing = getSeoBySiteId(siteId);
  if (!existing) throw new Error("SEO settings not found.");
  const seo = blueprint.seo;
  updateSeo(siteId, {
    defaultTitle: seo.defaultTitle,
    defaultDescription: seo.defaultDescription,
    robots: seo.robots,
    twitterHandle: seo.twitterHandle,
  });
}

function findReusablePage(
  existing: WebsitePage[],
  usedIds: Set<string>,
  blueprintPage: AiGeneratedPage,
): WebsitePage | null {
  const bySlug = existing.find(
    (page) => !usedIds.has(page.id) && page.slug === blueprintPage.slug,
  );
  if (bySlug) return bySlug;

  if (blueprintPage.pageType === "custom") return null;

  return (
    existing.find(
      (page) =>
        !usedIds.has(page.id) &&
        page.pageType === blueprintPage.pageType &&
        page.pageType !== "home",
    ) ?? null
  );
}

function writePageContent(
  pageId: string,
  blueprintPage: AiGeneratedPage,
  sortOrder: number,
): WebsitePage {
  updatePage(pageId, {
    title: blueprintPage.title,
    slug: blueprintPage.slug,
    sortOrder,
    status: "published",
    seoTitle: blueprintPage.seoTitle,
    seoDescription: blueprintPage.seoDescription,
  });
  replaceSections(
    pageId,
    blueprintPage.sections.map((section) => ({
      type: section.type,
      content: section.content,
      settings: section.settings ?? {},
    })),
  );
  return getPageById(pageId)!;
}

function applyPages(
  siteId: string,
  blueprintPages: AiGeneratedPage[],
): WebsitePage[] {
  const ordered = ensureHomePageFirst(blueprintPages);
  requireHomePage(ordered);

  const existing = listPages(siteId);
  const homeRow = existing.find((page) => page.pageType === "home");
  if (!homeRow) {
    throw new Error("Site is missing a home page.");
  }

  const homeBlueprint = ordered[0];
  const otherBlueprints = ordered.slice(1);

  const usedIds = new Set<string>([homeRow.id]);
  const matches: Array<{
    blueprintPage: AiGeneratedPage;
    existing: WebsitePage | null;
  }> = otherBlueprints.map((blueprintPage) => {
    const reusable = findReusablePage(existing, usedIds, blueprintPage);
    if (reusable) usedIds.add(reusable.id);
    return { blueprintPage, existing: reusable };
  });

  for (const page of existing) {
    if (page.pageType === "home") continue;
    if (usedIds.has(page.id)) continue;
    deletePage(page.id);
  }

  writePageContent(homeRow.id, homeBlueprint, 0);

  let sortOrder = 1;
  for (const match of matches) {
    if (match.existing) {
      writePageContent(match.existing.id, match.blueprintPage, sortOrder);
    } else {
      const created = createPage({
        siteId,
        title: match.blueprintPage.title,
        slug: match.blueprintPage.slug,
        pageType: match.blueprintPage.pageType,
      });
      writePageContent(created.id, match.blueprintPage, sortOrder);
    }
    sortOrder += 1;
  }

  return listPages(siteId);
}

function resolveNavPage(
  item: AiGeneratedNavItem,
  pages: WebsitePage[],
): WebsitePage | null {
  if (item.pageSlug) {
    const bySlug = pages.find((page) => page.slug === item.pageSlug);
    if (bySlug) return bySlug;
  }
  if (item.pageType) {
    return pages.find((page) => page.pageType === item.pageType) ?? null;
  }
  return null;
}

function flattenNavForReplace(
  items: AiGeneratedNavItem[],
  pages: WebsitePage[],
  blueprintPages: AiGeneratedPage[],
  parentKey: string | null = null,
): Array<{
  clientKey: string;
  label: string;
  href?: string | null;
  pageId?: string | null;
  parentKey?: string | null;
  openInNewTab?: boolean;
}> {
  const out: Array<{
    clientKey: string;
    label: string;
    href?: string | null;
    pageId?: string | null;
    parentKey?: string | null;
    openInNewTab?: boolean;
  }> = [];

  items.forEach((item, index) => {
    const clientKey = parentKey ? `${parentKey}.${index}` : `nav-${index}`;
    const page = resolveNavPage(item, pages);
    out.push({
      clientKey,
      label: item.label,
      pageId: page?.id ?? null,
      href: page ? null : resolveNavHref(item, blueprintPages),
      parentKey,
      openInNewTab: item.openInNewTab,
    });
    if (item.children?.length) {
      out.push(
        ...flattenNavForReplace(
          item.children,
          pages,
          blueprintPages,
          clientKey,
        ),
      );
    }
  });

  return out;
}

function applyNavigation(
  siteId: string,
  blueprint: AiWebsiteBlueprint,
  pages: WebsitePage[],
): void {
  replaceNavItems(
    siteId,
    flattenNavForReplace(blueprint.navigation, pages, blueprint.pages),
  );
}

function buildSectionsByPageId(
  pages: WebsitePage[],
): Record<string, WebsiteSection[]> {
  const out: Record<string, WebsiteSection[]> = {};
  for (const page of pages) {
    out[page.id] = listSections(page.id);
  }
  return out;
}

function pageIdsBySlug(pages: WebsitePage[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const page of pages) {
    out[page.slug] = page.id;
  }
  return out;
}

function applyBlueprintToSite(
  siteId: string,
  blueprint: AiWebsiteBlueprint,
): AiBlueprintExecuteResult {
  applyTheme(siteId, blueprint);
  applyHeader(siteId, blueprint);
  applyFooter(siteId, blueprint);
  applySeo(siteId, blueprint);
  const pages = applyPages(siteId, blueprint.pages);
  applyNavigation(siteId, blueprint, pages);

  const bundle = getSiteBundle(siteId);
  if (!bundle) {
    throw new Error("Site bundle missing after blueprint apply.");
  }

  return {
    siteId,
    site: bundle.site,
    pageIdsBySlug: pageIdsBySlug(pages),
    pages,
    sectionsByPageId: buildSectionsByPageId(pages),
    navigation: listNavItems(siteId),
  };
}

/**
 * Create a Website Builder site from a validated AiWebsiteBlueprint.
 * Atomic: site + theme + chrome + pages + sections + nav commit together or roll back.
 */
export function executeWebsiteBlueprint(
  input: AiBlueprintExecuteInput,
): AiBlueprintExecuteResult {
  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("workspaceId is required.");
  }

  const blueprint = assertAiWebsiteBlueprint(input.blueprint);
  requireHomePage(blueprint.pages);

  const category: SiteCategoryId | null | undefined =
    blueprint.intent.category ?? blueprint.brand.category ?? undefined;

  const run = sqlite.transaction(() => {
    const site = createWorkspaceSite({
      workspaceId,
      name: blueprint.site.name,
      slug: blueprint.site.slug ?? undefined,
      template: blueprint.intent.template,
      category,
    });

    return applyBlueprintToSite(site.id, blueprint);
  });

  return run();
}

/** @internal Exported for regression tests that exercise apply without re-create. */
export function executeWebsiteBlueprintOnSite(
  siteId: string,
  blueprint: AiWebsiteBlueprint,
): AiBlueprintExecuteResult {
  const validated = assertAiWebsiteBlueprint(blueprint);
  requireHomePage(validated.pages);

  const run = sqlite.transaction(() =>
    applyBlueprintToSite(siteId, validated),
  );
  return run();
}
