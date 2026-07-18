import { SectionRenderer } from "@/components/website/public/section-renderer";
import { SiteChrome } from "@/components/website/public/site-chrome";
import { mediaPublicUrl } from "@/lib/website/public";
import type {
  WebsiteBlogPost,
  WebsiteFormWithFields,
  WebsitePage,
  WebsiteSection,
  WebsiteSite,
  WebsiteTheme,
  WebsiteHeader,
  WebsiteFooter,
  WebsiteNavItem,
  WebsiteSeo,
} from "@/lib/website/types";

export function PublicSiteView({
  site,
  theme,
  header,
  footer,
  navigation,
  seo,
  page,
  sections,
  formsBySlug,
  blogPosts,
  basePath,
  blogPost,
}: {
  site: WebsiteSite;
  theme: WebsiteTheme;
  header: WebsiteHeader;
  footer: WebsiteFooter;
  navigation: WebsiteNavItem[];
  seo: WebsiteSeo;
  page?: WebsitePage | null;
  sections?: WebsiteSection[];
  formsBySlug: Record<string, WebsiteFormWithFields>;
  blogPosts: WebsiteBlogPost[];
  basePath: string;
  blogPost?: WebsiteBlogPost | null;
}) {
  const title =
    blogPost?.seoTitle ||
    blogPost?.title ||
    page?.seoTitle ||
    page?.title ||
    seo.defaultTitle ||
    site.name;
  const description =
    blogPost?.seoDescription ||
    blogPost?.excerpt ||
    page?.seoDescription ||
    seo.defaultDescription ||
    "";
  const robots = page?.seoRobots || seo.robots;
  const ogImageId =
    page?.seoOgImageMediaId || blogPost?.coverMediaId || seo.ogImageMediaId;

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={robots} />
      {ogImageId ? (
        <meta property="og:image" content={mediaPublicUrl(ogImageId)} />
      ) : null}
      {seo.jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: seo.jsonLd }}
        />
      ) : null}

      <SiteChrome
        theme={theme}
        header={header}
        footer={footer}
        navigation={navigation}
        basePath={basePath}
        siteName={site.name}
      >
        {blogPost ? (
          <article className="mx-auto max-w-3xl px-6 py-14">
            <p className="text-sm" style={{ color: theme.mutedColor }}>
              {blogPost.publishedAt
                ? new Date(blogPost.publishedAt).toLocaleDateString()
                : null}
              {blogPost.authorName ? ` · ${blogPost.authorName}` : ""}
            </p>
            <h1
              className="mt-3 text-4xl font-semibold tracking-tight"
              style={{ fontFamily: theme.fontHeading }}
            >
              {blogPost.title}
            </h1>
            {blogPost.coverMediaId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPublicUrl(blogPost.coverMediaId)}
                alt=""
                className="mt-8 w-full object-cover"
                style={{ borderRadius: theme.borderRadius }}
              />
            ) : null}
            <div className="prose mt-8 max-w-none whitespace-pre-wrap">
              {blogPost.content}
            </div>
          </article>
        ) : (
          (sections ?? []).map((section) => (
            <SectionRenderer
              key={section.id}
              section={section}
              theme={theme}
              basePath={basePath}
              formsBySlug={formsBySlug}
              blogPosts={blogPosts}
            />
          ))
        )}
      </SiteChrome>
    </>
  );
}
