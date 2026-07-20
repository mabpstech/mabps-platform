import Link from "next/link";
import { PublicForm } from "@/components/website/public/public-form";
import { mediaPublicUrl } from "@/lib/website/media-url";
import type {
  WebsiteBlogPost,
  WebsiteFormWithFields,
  WebsiteSection,
  WebsiteTheme,
} from "@/lib/website/types";

function paddingClass(value?: string): string {
  switch (value) {
    case "none":
      return "py-0";
    case "sm":
      return "py-6";
    case "lg":
      return "py-20";
    case "xl":
      return "py-28";
    default:
      return "py-14";
  }
}

export function SectionRenderer({
  section,
  theme,
  basePath,
  formsBySlug,
  blogPosts,
}: {
  section: WebsiteSection;
  theme: WebsiteTheme;
  basePath: string;
  formsBySlug: Record<string, WebsiteFormWithFields>;
  blogPosts: WebsiteBlogPost[];
}) {
  const content = section.content;
  const align =
    content.align === "left"
      ? "text-left items-start"
      : content.align === "right"
        ? "text-right items-end"
        : "text-center items-center";

  const style = {
    background: section.settings.background || undefined,
    color: theme.textColor,
  };

  if (section.type === "spacer") {
    const height =
      content.height === "sm"
        ? "h-8"
        : content.height === "lg"
          ? "h-24"
          : content.height === "xl"
            ? "h-32"
            : "h-16";
    return <div className={height} aria-hidden />;
  }

  return (
    <section
      className={`${paddingClass(section.settings.paddingY)} px-6`}
      style={style}
    >
      <div className="mx-auto max-w-5xl">
        {section.type === "hero" ? (
          <HeroBlock
            content={content}
            theme={theme}
            basePath={basePath}
            align={align}
          />
        ) : null}

        {section.type === "richText" ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{
              __html: String(content.html ?? ""),
            }}
          />
        ) : null}

        {section.type === "image" && content.mediaId ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaPublicUrl(String(content.mediaId))}
              alt={String(content.alt ?? "")}
              className="w-full object-cover"
              style={{ borderRadius: theme.borderRadius }}
            />
            {content.caption ? (
              <figcaption
                className="mt-2 text-sm"
                style={{ color: theme.mutedColor }}
              >
                {String(content.caption)}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {section.type === "features" ? (
          <div>
            {content.heading ? (
              <h2
                className="mb-8 text-3xl font-semibold"
                style={{ fontFamily: theme.fontHeading }}
              >
                {String(content.heading)}
              </h2>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-3">
              {asArray(content.items).map((item, index) => (
                <div key={index}>
                  <h3 className="text-lg font-medium">
                    {String(item.title ?? "Feature")}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-6"
                    style={{ color: theme.mutedColor }}
                  >
                    {String(item.description ?? "")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {section.type === "cta" ? (
          <div
            className="rounded-xl px-8 py-10 text-center"
            style={{
              background: theme.secondaryColor,
              color: "#fff",
              borderRadius: theme.borderRadius,
            }}
          >
            <h2
              className="text-3xl font-semibold"
              style={{ fontFamily: theme.fontHeading }}
            >
              {String(content.heading ?? "")}
            </h2>
            {content.body ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90">
                {String(content.body)}
              </p>
            ) : null}
            {content.buttonLabel ? (
              <Link
                href={hrefWithBase(
                  basePath,
                  String(content.buttonHref || "/"),
                )}
                className="mt-6 inline-block bg-white px-4 py-2 text-sm font-medium"
                style={{
                  color: theme.secondaryColor,
                  borderRadius: theme.borderRadius,
                }}
              >
                {String(content.buttonLabel)}
              </Link>
            ) : null}
          </div>
        ) : null}

        {(section.type === "products" || section.type === "collections") && (
          <div>
            {content.heading ? (
              <h2
                className="mb-8 text-3xl font-semibold"
                style={{ fontFamily: theme.fontHeading }}
              >
                {String(content.heading)}
              </h2>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {asArray(content.items).map((item, index) => (
                <Link
                  key={index}
                  href={
                    item.href
                      ? hrefWithBase(basePath, String(item.href))
                      : "#"
                  }
                  className="border p-5 transition hover:shadow-sm"
                  style={{ borderRadius: theme.borderRadius }}
                >
                  <h3 className="text-lg font-medium">
                    {String(item.name ?? "Item")}
                  </h3>
                  <p
                    className="mt-2 text-sm"
                    style={{ color: theme.mutedColor }}
                  >
                    {String(item.description ?? "")}
                  </p>
                  {item.price ? (
                    <p className="mt-3 text-sm font-medium">
                      {String(item.price)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        )}

        {section.type === "form" ? (
          <div>
            {content.heading ? (
              <h2
                className="mb-6 text-3xl font-semibold"
                style={{ fontFamily: theme.fontHeading }}
              >
                {String(content.heading)}
              </h2>
            ) : null}
            {formsBySlug[String(content.formSlug ?? "contact")] ? (
              <PublicForm
                form={formsBySlug[String(content.formSlug ?? "contact")]}
                primaryColor={theme.primaryColor}
                borderRadius={theme.borderRadius}
              />
            ) : (
              <p style={{ color: theme.mutedColor }}>Form unavailable.</p>
            )}
          </div>
        ) : null}

        {section.type === "blogList" ? (
          <div>
            {content.heading ? (
              <h2
                className="mb-8 text-3xl font-semibold"
                style={{ fontFamily: theme.fontHeading }}
              >
                {String(content.heading)}
              </h2>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              {blogPosts
                .slice(0, Number(content.limit ?? 6))
                .map((post) => (
                  <Link
                    key={post.id}
                    href={`${basePath}/blog/${post.slug}`}
                    className="border p-5"
                    style={{ borderRadius: theme.borderRadius }}
                  >
                    <h3 className="text-lg font-medium">{post.title}</h3>
                    {post.excerpt ? (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: theme.mutedColor }}
                      >
                        {post.excerpt}
                      </p>
                    ) : null}
                  </Link>
                ))}
            </div>
          </div>
        ) : null}

        {section.type === "gallery" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {asStringArray(content.mediaIds).map((mediaId) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={mediaId}
                src={mediaPublicUrl(mediaId)}
                alt=""
                className="h-48 w-full object-cover"
                style={{ borderRadius: theme.borderRadius }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function normalizeHref(href: string): string {
  if (!href || href === "/") return "";
  if (href.startsWith("http")) return href;
  return href.startsWith("/") ? href : `/${href}`;
}

function hrefWithBase(basePath: string, href: string): string {
  if (href.startsWith("http")) return href;
  return `${basePath}${normalizeHref(href)}` || basePath || "/";
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function HeroBlock({
  content,
  theme,
  basePath,
  align,
}: {
  content: Record<string, unknown>;
  theme: WebsiteTheme;
  basePath: string;
  align: string;
}) {
  const desktopId =
    (typeof content.desktopMediaId === "string" && content.desktopMediaId) ||
    (typeof content.backgroundMediaId === "string" &&
      content.backgroundMediaId) ||
    null;
  const mobileId =
    typeof content.mobileMediaId === "string" ? content.mobileMediaId : null;
  const videoUrl =
    typeof content.backgroundVideoUrl === "string"
      ? content.backgroundVideoUrl.trim()
      : "";
  const overlay = Math.min(80, Math.max(0, Number(content.overlay ?? 0)));
  const heightClass =
    content.height === "sm"
      ? "min-h-[280px] py-12"
      : content.height === "lg"
        ? "min-h-[560px] py-24"
        : content.height === "xl"
          ? "min-h-[72vh] py-28"
          : "min-h-[420px] py-16";
  const animationClass =
    content.animation === "rise"
      ? "animate-[fadeRise_700ms_ease-out]"
      : content.animation === "fade"
        ? "animate-[fadeIn_700ms_ease-out]"
        : "";
  const hasMedia = Boolean(desktopId || mobileId || videoUrl);
  const textColor = hasMedia ? "#ffffff" : theme.textColor;
  const mutedColor = hasMedia ? "rgba(255,255,255,0.85)" : theme.mutedColor;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${heightClass}`}
      style={{ borderRadius: theme.borderRadius }}
    >
      {videoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={desktopId ? mediaPublicUrl(desktopId) : undefined}
        >
          <source src={videoUrl} />
        </video>
      ) : null}
      {desktopId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaPublicUrl(desktopId)}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${mobileId ? "hidden sm:block" : ""}`}
        />
      ) : null}
      {mobileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaPublicUrl(mobileId)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover sm:hidden"
        />
      ) : null}
      {hasMedia && overlay > 0 ? (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(0,0,0,${overlay / 100})` }}
        />
      ) : null}
      <div
        className={`relative z-10 flex h-full flex-col justify-center gap-4 px-6 sm:px-10 ${align} ${animationClass}`}
        style={{ color: textColor }}
      >
        {content.eyebrow ? (
          <p
            className="text-sm uppercase tracking-[0.18em]"
            style={{ color: mutedColor }}
          >
            {String(content.eyebrow)}
          </p>
        ) : null}
        <h1
          className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ fontFamily: theme.fontHeading }}
        >
          {String(content.heading ?? "")}
        </h1>
        {content.subheading ? (
          <p className="max-w-2xl text-lg" style={{ color: mutedColor }}>
            {String(content.subheading)}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3">
          {content.primaryLabel ? (
            <Link
              href={hrefWithBase(basePath, String(content.primaryHref || "/"))}
              className="px-4 py-2 text-sm font-medium text-white"
              style={{
                background: theme.primaryColor,
                borderRadius: theme.borderRadius,
              }}
            >
              {String(content.primaryLabel)}
            </Link>
          ) : null}
          {content.secondaryLabel ? (
            <Link
              href={hrefWithBase(
                basePath,
                String(content.secondaryHref || "/"),
              )}
              className="border px-4 py-2 text-sm font-medium"
              style={{
                borderColor: hasMedia ? "#ffffff" : theme.primaryColor,
                color: hasMedia ? "#ffffff" : theme.primaryColor,
                borderRadius: theme.borderRadius,
              }}
            >
              {String(content.secondaryLabel)}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
