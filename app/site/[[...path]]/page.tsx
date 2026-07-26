import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PublicSiteView } from "@/components/website/public/public-site-view";
import {
  loadRenderablePage,
  loadRenderableSite,
} from "@/lib/website/render";
import { resolvePublishedSiteByHost } from "@/lib/website/publish";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

/**
 * Custom-domain entrypoint. Proxy rewrites verified custom hosts to /site/...
 */
export default async function CustomDomainSitePage({ params }: PageProps) {
  const { path } = await params;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) notFound();

  const published = resolvePublishedSiteByHost(host);
  if (!published) notFound();

  const renderable = loadRenderableSite({
    slug: published.slug,
    host,
    preview: false,
  });
  if (!renderable) notFound();

  const resolved = loadRenderablePage(renderable.site.id, path);
  if (!resolved) notFound();

  // On a custom domain, links are root-relative (no /p/{slug} prefix).
  const basePath = "";
  const proto = requestHeaders.get("x-forwarded-proto") || "https";
  const requestOrigin = `${proto}://${host.split(":")[0]}`;

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
