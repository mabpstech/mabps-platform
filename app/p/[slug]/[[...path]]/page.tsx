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
};

export default async function PublicSlugSitePage({ params }: PageProps) {
  const { slug, path } = await params;
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? undefined;

  let renderable = loadRenderableSite({ slug, host, preview: false });

  if (!renderable) {
    const session = await getSession();
    if (!session) notFound();
    renderable = loadRenderableSite({ slug, host, preview: true });
  }

  if (!renderable) notFound();

  const resolved = loadRenderablePage(renderable.site.id, path);
  if (!resolved) notFound();

  const basePath = `/p/${renderable.site.slug}`;

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
    />
  );
}
