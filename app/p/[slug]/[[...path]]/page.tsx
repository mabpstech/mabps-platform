import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicSiteView } from "@/components/website/public/public-site-view";
import { getSession } from "@/lib/auth/session";
import {
  loadRenderablePage,
  loadRenderableSite,
} from "@/lib/website/render";

type PageProps = {
  params: Promise<{ slug: string; path?: string[] }>;
  searchParams: Promise<{ preview?: string }>;
};

function wantsPreviewMode(preview: string | undefined): boolean {
  return preview === "1" || preview === "true";
}

export default async function PublicSlugSitePage({
  params,
  searchParams,
}: PageProps) {
  const { slug, path } = await params;
  const { preview: previewParam } = await searchParams;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? undefined;
  const explicitPreview = wantsPreviewMode(previewParam);

  let preview = false;
  let renderable = null;

  if (explicitPreview) {
    const session = await getSession();
    if (session) {
      // Authenticated editor/preview: include draft sites and draft pages.
      preview = true;
      renderable = loadRenderableSite({ slug, host, preview: true });
    } else {
      // No session: ignore preview flag and serve the public site if published.
      renderable = loadRenderableSite({ slug, host, preview: false });
    }
  } else {
    renderable = loadRenderableSite({ slug, host, preview: false });
    if (!renderable) {
      const session = await getSession();
      if (!session) notFound();
      preview = true;
      renderable = loadRenderableSite({ slug, host, preview: true });
    }
  }

  if (!renderable) notFound();

  const resolved = loadRenderablePage(renderable.site.id, path, { preview });
  if (!resolved) notFound();

  const basePath = `/p/${renderable.site.slug}`;
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const requestOrigin = host ? `${proto}://${host.split(":")[0]}` : null;

  if (resolved.kind === "blog") {
    return (
      <PublicSiteView
        site={renderable.site}
        theme={renderable.theme}
        header={renderable.header}
        footer={renderable.footer}
        navigation={renderable.navigation}
        seo={renderable.seo}
        formsBySlug={renderable.formsBySlug}
        blogPosts={renderable.blogPosts}
        basePath={basePath}
        blogPost={resolved.post}
        requestOrigin={requestOrigin}
      />
    );
  }

  return (
    <PublicSiteView
      site={renderable.site}
      theme={renderable.theme}
      header={renderable.header}
      footer={renderable.footer}
      navigation={renderable.navigation}
      seo={renderable.seo}
      page={resolved.page}
      sections={resolved.sections}
      formsBySlug={renderable.formsBySlug}
      blogPosts={renderable.blogPosts}
      basePath={basePath}
      requestOrigin={requestOrigin}
    />
  );
}
