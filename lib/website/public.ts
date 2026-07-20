import {
  getBlogPostBySlug,
  getFormBySlug,
  getFormWithFields,
  getPageBySlug,
  getSiteBundle,
  getSiteByCustomDomain,
  getSiteBySlug,
  listPublishedBlogPosts,
  listSections,
} from "@/lib/website/repository";
import type {
  WebsiteBlogPost,
  WebsiteFormWithFields,
  WebsitePage,
  WebsiteSection,
  WebsiteSite,
} from "@/lib/website/types";

export type PublicSiteView = NonNullable<ReturnType<typeof getSiteBundle>> & {
  preview: boolean;
};

export function resolveSiteBySlugOrDomain(input: {
  slug?: string;
  host?: string;
}): WebsiteSite | null {
  if (input.host) {
    const hostname = input.host.split(":")[0]?.toLowerCase();
    if (hostname) {
      const byDomain = getSiteByCustomDomain(hostname);
      if (byDomain) return byDomain;
    }
  }
  if (input.slug) {
    return getSiteBySlug(input.slug);
  }
  return null;
}

export function loadPublicSite(
  site: WebsiteSite,
  options: { preview?: boolean } = {},
): PublicSiteView | null {
  const preview = Boolean(options.preview);
  if (!preview && site.status !== "published") {
    return null;
  }
  if (
    !preview &&
    site.customDomain &&
    !site.domainVerified &&
    options.preview === false
  ) {
    // Custom domain hosting still requires verification; slug preview path is fine.
  }

  const bundle = getSiteBundle(site.id);
  if (!bundle) return null;
  return { ...bundle, preview };
}

export function resolvePublicPage(
  siteId: string,
  pathSegments: string[] | undefined,
  options: { preview?: boolean } = {},
): { page: WebsitePage; sections: WebsiteSection[] } | null {
  const preview = Boolean(options.preview);
  const segments = pathSegments?.filter(Boolean) ?? [];
  const slug = segments.length === 0 ? "home" : segments[0];

  if (segments.length > 1 && segments[0] === "blog") {
    return null;
  }

  const page = getPageBySlug(siteId, slug);
  if (!page) return null;
  if (!preview && page.status !== "published") return null;

  return {
    page,
    sections: listSections(page.id).filter(
      (section) => preview || !section.settings.hidden,
    ),
  };
}

export function resolvePublicBlogPost(
  siteId: string,
  slug: string,
): WebsiteBlogPost | null {
  const post = getBlogPostBySlug(siteId, slug);
  if (!post || post.status !== "published") return null;
  return post;
}

export function loadPublicBlogIndex(siteId: string, limit = 24): WebsiteBlogPost[] {
  return listPublishedBlogPosts(siteId, limit);
}

export function loadPublicForm(
  siteId: string,
  formSlug: string,
): WebsiteFormWithFields | null {
  const form = getFormBySlug(siteId, formSlug);
  if (!form || form.status !== "active") return null;
  return getFormWithFields(form.id);
}
