import { SectionRenderer } from "@/components/website/public/section-renderer";
import { SiteChrome } from "@/components/website/public/site-chrome";
import { mediaPublicUrl } from "@/lib/website/media-url";
import {
  sanitizeCustomCss,
  sanitizeJsonLd,
} from "@/lib/website/sanitize";
import { absolutePublicUrl, publicSiteOrigin } from "@/lib/website/seo-public";
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
  requestOrigin = null,
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
  requestOrigin?: string | null;
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
  const safeJsonLd = seo.jsonLd ? sanitizeJsonLd(seo.jsonLd) : null;
  const safeTheme: WebsiteTheme = {
    ...theme,
    customCss: theme.customCss ? sanitizeCustomCss(theme.customCss) || null : null,
  };

  const origin = publicSiteOrigin({
    site,
    requestOrigin,
    canonicalBaseUrl: seo.canonicalBaseUrl,
  });
  const pagePath = blogPost
    ? `${basePath}/blog/${blogPost.slug}`
    : page && page.pageType !== "home" && page.slug !== "home"
      ? `${basePath}/${page.slug}`
      : basePath || "/";
  const canonicalUrl = absolutePublicUrl(origin, pagePath || "/");
  const ogImageUrl = ogImageId
    ? absolutePublicUrl(origin, mediaPublicUrl(ogImageId, "large"))
    : null;
  const twitterHandle = seo.twitterHandle?.replace(/^@/, "") || null;
  const faviconId =
    theme.faviconMediaId || theme.tokens.brand.faviconMediaId || null;

  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={robots} />
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      <meta property="og:type" content={blogPost ? "article" : "website"} />
      <meta property="og:site_name" content={site.name} />
      <meta property="og:title" content={title} />
      {description ? (
        <meta property="og:description" content={description} />
      ) : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      {ogImageUrl ? <meta property="og:image" content={ogImageUrl} /> : null}

      <meta name="twitter:card" content={ogImageUrl ? "summary_large_image" : "summary"} />
      {twitterHandle ? (
        <meta name="twitter:site" content={`@${twitterHandle}`} />
      ) : null}
      <meta name="twitter:title" content={title} />
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      {ogImageUrl ? <meta name="twitter:image" content={ogImageUrl} /> : null}

      {faviconId ? (
        <link rel="icon" href={mediaPublicUrl(faviconId)} />
      ) : null}
      {safeJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd }}
        />
      ) : null}

      <SiteChrome
        theme={safeTheme}
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
              theme={safeTheme}
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
