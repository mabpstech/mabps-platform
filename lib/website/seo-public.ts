import {
  getSiteByCustomDomain,
  getSiteBySlug,
  getSiteBundle,
  listPages,
  listPublishedBlogPosts,
} from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";

export function resolvePublicSiteForSeo(input: {
  slug?: string;
  host?: string;
}): WebsiteSite | null {
  if (input.host) {
    const hostname = input.host.split(":")[0]?.toLowerCase();
    if (hostname) {
      const byDomain = getSiteByCustomDomain(hostname);
      if (byDomain && byDomain.status === "published" && byDomain.domainVerified) {
        return byDomain;
      }
    }
  }
  if (input.slug) {
    const site = getSiteBySlug(input.slug);
    if (site && site.status === "published") return site;
  }
  return null;
}

export function publicSiteOrigin(options: {
  site: WebsiteSite;
  requestOrigin?: string | null;
  canonicalBaseUrl?: string | null;
}): string {
  const canonical = options.canonicalBaseUrl?.trim().replace(/\/$/, "");
  if (canonical) return canonical;
  if (options.site.customDomain && options.site.domainVerified) {
    return `https://${options.site.customDomain}`;
  }
  if (options.requestOrigin) {
    return options.requestOrigin.replace(/\/$/, "");
  }
  return "";
}

export function absolutePublicUrl(
  origin: string,
  path: string,
): string {
  if (!path) return origin || "/";
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!origin) return normalized;
  return `${origin}${normalized}`;
}

export function buildPublicSitemapXml(options: {
  site: WebsiteSite;
  origin: string;
  basePath: string;
}): string {
  const pages = listPages(options.site.id).filter(
    (page) => page.status === "published",
  );
  const posts = listPublishedBlogPosts(options.site.id, 500);
  const urls: Array<{ loc: string; lastmod?: string }> = [];

  for (const page of pages) {
    const path =
      page.pageType === "home" || page.slug === "home"
        ? options.basePath || "/"
        : `${options.basePath}/${page.slug}`;
    urls.push({
      loc: absolutePublicUrl(options.origin, path || "/"),
      lastmod: page.updatedAt,
    });
  }

  for (const post of posts) {
    urls.push({
      loc: absolutePublicUrl(
        options.origin,
        `${options.basePath}/blog/${post.slug}`,
      ),
      lastmod: post.updatedAt || post.publishedAt || undefined,
    });
  }

  const body = urls
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `\n    <lastmod>${entry.lastmod.slice(0, 10)}</lastmod>`
        : "";
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildPublicRobotsTxt(options: {
  site: WebsiteSite;
  origin: string;
  basePath: string;
  robots?: string | null;
}): string {
  const disallowAll =
    options.robots?.includes("noindex") ||
    options.site.status !== "published";
  const sitemapUrl = absolutePublicUrl(
    options.origin,
    `${options.basePath}/sitemap.xml`.replace(/\/{2,}/g, "/"),
  );

  if (disallowAll) {
    return `User-agent: *\nDisallow: /\n`;
  }

  return `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;
}

export function publicSeoBundle(siteId: string) {
  return getSiteBundle(siteId);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
