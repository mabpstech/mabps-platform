import {
  getFooterBySiteId,
  getHeaderBySiteId,
  getSeoBySiteId,
  getThemeBySiteId,
  listBlogPosts,
  listPages,
  listSections,
} from "@/lib/website/repository";
import type { MediaUsageRef } from "@/lib/website/types";

const MEDIA_ID_KEYS = new Set([
  "mediaId",
  "mediaIds",
  "desktopMediaId",
  "mobileMediaId",
  "backgroundMediaId",
  "logoMediaId",
  "faviconMediaId",
  "ogImageMediaId",
  "seoOgImageMediaId",
  "coverMediaId",
]);

function collectIdsFromValue(value: unknown, into: Set<string>): void {
  if (typeof value === "string" && value.length > 10) {
    // Heuristic: UUIDs / nanoids used as media IDs — only accept via known keys.
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") into.add(item);
      else collectIdsFromValue(item, into);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (MEDIA_ID_KEYS.has(key)) {
        if (typeof child === "string" && child) into.add(child);
        if (Array.isArray(child)) {
          for (const item of child) {
            if (typeof item === "string" && item) into.add(item);
          }
        }
      } else {
        collectIdsFromValue(child, into);
      }
    }
  }
}

function pushUsage(
  usages: MediaUsageRef[],
  mediaId: string,
  targetId: string,
  usage: MediaUsageRef,
): void {
  if (mediaId === targetId) usages.push(usage);
}

/**
 * Resolve where a media asset is referenced across the site.
 * Website Builder is the primary consumer today; kinds are shaped for future modules.
 */
export function findMediaUsages(siteId: string, mediaId: string): MediaUsageRef[] {
  const usages: MediaUsageRef[] = [];

  const theme = getThemeBySiteId(siteId);
  if (theme) {
    pushUsage(usages, theme.logoMediaId ?? "", mediaId, {
      kind: "theme",
      label: "Website theme logo",
      field: "logoMediaId",
    });
    pushUsage(usages, theme.faviconMediaId ?? "", mediaId, {
      kind: "theme",
      label: "Website favicon",
      field: "faviconMediaId",
    });
  }

  const header = getHeaderBySiteId(siteId);
  if (header?.logoMediaId) {
    pushUsage(usages, header.logoMediaId, mediaId, {
      kind: "header",
      label: "Header logo",
      field: "logoMediaId",
    });
  }

  const seo = getSeoBySiteId(siteId);
  if (seo?.ogImageMediaId) {
    pushUsage(usages, seo.ogImageMediaId, mediaId, {
      kind: "seo",
      label: "Default social image",
      field: "ogImageMediaId",
    });
  }

  // Footer may contain nested JSON; scan for known keys.
  const footer = getFooterBySiteId(siteId);
  if (footer) {
    const ids = new Set<string>();
    collectIdsFromValue(footer, ids);
    if (ids.has(mediaId)) {
      usages.push({
        kind: "website",
        label: "Website footer",
        field: "footer",
      });
    }
  }

  for (const page of listPages(siteId)) {
    if (page.seoOgImageMediaId === mediaId) {
      usages.push({
        kind: "page",
        label: `Page SEO · ${page.title}`,
        field: "seoOgImageMediaId",
        pageId: page.id,
        pageTitle: page.title,
      });
    }

    for (const section of listSections(page.id)) {
      const content = section.content as Record<string, unknown>;
      const settings = section.settings as Record<string, unknown>;
      const ids = new Set<string>();
      collectIdsFromValue(content, ids);
      collectIdsFromValue(settings, ids);
      if (!ids.has(mediaId)) continue;

      let kind: MediaUsageRef["kind"] = "section";
      let label = `${page.title} · ${section.type}`;
      if (section.type === "hero") {
        kind = "hero";
        label = `Hero · ${page.title}`;
      } else if (section.type === "products" || section.type === "collections") {
        kind = "product";
        label = `Products · ${page.title}`;
      } else if (section.type === "image" || section.type === "gallery") {
        kind = "page";
        label = `Page image · ${page.title}`;
      }

      usages.push({
        kind,
        label,
        field: "content",
        pageId: page.id,
        pageTitle: page.title,
      });
    }
  }

  for (const post of listBlogPosts(siteId)) {
    if (post.coverMediaId === mediaId) {
      usages.push({
        kind: "blog",
        label: `Blog cover · ${post.title}`,
        field: "coverMediaId",
        postId: post.id,
        postTitle: post.title,
      });
    }
  }

  return usages;
}

export function mediaIsInUse(siteId: string, mediaId: string): boolean {
  return findMediaUsages(siteId, mediaId).length > 0;
}
