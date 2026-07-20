import {
  getFormBySlug,
  getFormWithFields,
  getSiteBundle,
  listForms,
} from "@/lib/website/repository";
import {
  loadPublicBlogIndex,
  loadPublicSite,
  resolvePublicBlogPost,
  resolvePublicPage,
  resolveSiteBySlugOrDomain,
} from "@/lib/website/public";
import type { WebsiteFormWithFields } from "@/lib/website/types";

export function loadRenderableSite(input: {
  slug?: string;
  host?: string;
  preview?: boolean;
}) {
  const site = resolveSiteBySlugOrDomain({
    slug: input.slug,
    host: input.host,
  });
  if (!site) return null;

  const view = loadPublicSite(site, { preview: input.preview });
  if (!view) return null;

  const formsBySlug: Record<string, WebsiteFormWithFields> = {};
  for (const form of listForms(site.id)) {
    const withFields = getFormWithFields(form.id);
    if (withFields) formsBySlug[form.slug] = withFields;
  }

  // Ensure contact form slug resolves even if list order changes.
  const contact = getFormBySlug(site.id, "contact");
  if (contact) {
    const withFields = getFormWithFields(contact.id);
    if (withFields) formsBySlug.contact = withFields;
  }

  return {
    ...view,
    formsBySlug,
    blogPosts: loadPublicBlogIndex(site.id),
  };
}

export function loadRenderablePage(
  siteId: string,
  pathSegments: string[] | undefined,
  options: { preview?: boolean } = {},
) {
  const segments = pathSegments?.filter(Boolean) ?? [];
  if (segments[0] === "blog" && segments[1]) {
    const post = resolvePublicBlogPost(siteId, segments[1]);
    return post ? { kind: "blog" as const, post } : null;
  }
  const page = resolvePublicPage(siteId, segments, options);
  return page ? { kind: "page" as const, ...page } : null;
}

export function getPreviewBundle(siteId: string) {
  return getSiteBundle(siteId);
}
