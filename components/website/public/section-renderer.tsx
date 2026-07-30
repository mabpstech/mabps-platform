import Link from "next/link";
import type { CSSProperties } from "react";
import { PublicForm } from "@/components/website/public/public-form";
import { mediaPublicUrl } from "@/lib/website/media-url";
import { sanitizeRichHtml } from "@/lib/website/sanitize";
import { readableOn } from "@/lib/website/theme";
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
      return "py-10 sm:py-12";
    case "lg":
      return "py-20 sm:py-24";
    case "xl":
      return "py-24 sm:py-32";
    default:
      return "py-16 sm:py-20";
  }
}

function containerClass(theme: WebsiteTheme, fullWidth?: boolean): string {
  if (fullWidth) return "mx-auto max-w-none";
  const preset = theme.tokens.sections.containerPreset;
  if (preset === "narrow") return "mx-auto w-full max-w-3xl";
  if (preset === "wide") return "mx-auto w-full max-w-7xl";
  if (preset === "full") return "mx-auto w-full max-w-none";
  return "mx-auto w-full max-w-6xl";
}

function buttonRadius(theme: WebsiteTheme): string {
  if (theme.tokens.buttons.shape === "pill") return "9999px";
  if (theme.tokens.buttons.shape === "square") return "0px";
  return `var(--site-radius-button, ${theme.borderRadius})`;
}

function sectionHeadingStyle(theme: WebsiteTheme): CSSProperties {
  return {
    fontFamily: "var(--site-font-heading, " + theme.fontHeading + ")",
    fontSize: "var(--site-font-size-h2)",
    fontWeight: "var(--site-font-heading-weight)" as unknown as number,
    letterSpacing: "var(--site-letter-spacing)",
    color: "var(--site-color-text, " + theme.textColor + ")",
    lineHeight: 1.15,
  };
}

function cardStyle(theme: WebsiteTheme): CSSProperties {
  const cards = theme.tokens.cards;
  const radius = cards.radius || "var(--site-radius-card)";
  return {
    background:
      cards.style === "flat"
        ? "transparent"
        : "var(--site-color-surface, " + theme.backgroundColor + ")",
    border:
      cards.border || cards.style === "outlined"
        ? "1px solid var(--site-color-border)"
        : "1px solid transparent",
    borderRadius: radius,
    boxShadow:
      cards.style === "elevated"
        ? "var(--site-shadow-card)"
        : cards.shadow !== "none"
          ? "var(--site-shadow-card)"
          : "none",
    padding: "var(--site-card-padding)",
  };
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

  const style: CSSProperties = {
    background: section.settings.background || undefined,
    color: "var(--site-color-text, " + theme.textColor + ")",
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

  const responsiveVisibility = [
    section.settings.hideOnMobile ? "hidden sm:block" : "",
    section.settings.hideOnDesktop ? "sm:hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (section.type === "hero") {
    return (
      <section className={responsiveVisibility} style={style}>
        <HeroBlock
          content={content}
          theme={theme}
          basePath={basePath}
          align={align}
        />
      </section>
    );
  }

  const shell = containerClass(theme, section.settings.fullWidth);

  return (
    <section
      className={`${paddingClass(section.settings.paddingY)} px-5 sm:px-8 ${responsiveVisibility}`}
      style={style}
    >
      <div className={shell}>
        {section.type === "richText" ? (
          <div
            className="prose mx-auto max-w-none"
            style={{
              maxWidth: "var(--site-paragraph-width)",
              fontSize: "var(--site-font-size-body)",
              lineHeight: "var(--site-line-height)",
              color: "var(--site-color-text-secondary)",
            }}
            dangerouslySetInnerHTML={{
              __html: sanitizeRichHtml(String(content.html ?? "")),
            }}
          />
        ) : null}

        {section.type === "image" && content.mediaId ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaPublicUrl(String(content.mediaId), "large")}
              alt={String(content.alt ?? "")}
              className="w-full object-cover"
              style={{ borderRadius: "var(--site-radius-image)" }}
            />
            {content.caption ? (
              <figcaption
                className="mt-3 text-sm"
                style={{ color: "var(--site-color-muted)" }}
              >
                {String(content.caption)}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        {section.type === "features" ? (
          <FeaturesBlock content={content} theme={theme} />
        ) : null}

        {section.type === "cta" ? (
          <CtaBlock content={content} theme={theme} basePath={basePath} />
        ) : null}

        {(section.type === "products" || section.type === "collections") && (
          <CatalogBlock
            content={content}
            theme={theme}
            basePath={basePath}
          />
        )}

        {section.type === "form" ? (
          <div className="mx-auto max-w-xl">
            {content.heading ? (
              <h2 className="mb-8 tracking-tight" style={sectionHeadingStyle(theme)}>
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
              <p style={{ color: "var(--site-color-muted)" }}>Form unavailable.</p>
            )}
          </div>
        ) : null}

        {section.type === "blogList" ? (
          <div>
            {content.heading ? (
              <h2 className="mb-10 tracking-tight" style={sectionHeadingStyle(theme)}>
                {String(content.heading)}
              </h2>
            ) : null}
            <div
              className="grid gap-6 sm:grid-cols-2"
              style={{ gap: "var(--site-grid-gap)" }}
            >
              {blogPosts
                .slice(0, Number(content.limit ?? 6))
                .map((post) => (
                  <Link
                    key={post.id}
                    href={`${basePath}/blog/${post.slug}`}
                    className="site-card block"
                    data-hover-lift={theme.tokens.cards.hoverLift ? "true" : undefined}
                    style={cardStyle(theme)}
                  >
                    <h3
                      className="text-lg font-semibold tracking-tight"
                      style={{ fontFamily: "var(--site-font-heading)" }}
                    >
                      {post.title}
                    </h3>
                    {post.excerpt ? (
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "var(--site-color-muted)" }}
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
          <div>
            {content.heading ? (
              <h2 className="mb-10 tracking-tight" style={sectionHeadingStyle(theme)}>
                {String(content.heading)}
              </h2>
            ) : null}
            <div
              className="grid gap-4 sm:grid-cols-3"
              style={{ gap: "var(--site-grid-gap)" }}
            >
              {asStringArray(content.mediaIds).map((mediaId, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={mediaId}
                  src={mediaPublicUrl(mediaId, "medium")}
                  alt={
                    content.heading
                      ? `${String(content.heading)} image ${index + 1}`
                      : `Gallery image ${index + 1}`
                  }
                  className="aspect-[4/3] h-auto w-full object-cover"
                  style={{ borderRadius: "var(--site-radius-image)" }}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeaturesBlock({
  content,
  theme,
}: {
  content: Record<string, unknown>;
  theme: WebsiteTheme;
}) {
  const items = asArray(content.items);
  return (
    <div>
      {content.heading ? (
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h2 className="tracking-tight" style={sectionHeadingStyle(theme)}>
            {String(content.heading)}
          </h2>
        </div>
      ) : null}
      <div
        className={`grid ${
          items.length === 2
            ? "sm:grid-cols-2"
            : items.length >= 4
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-3"
        }`}
        style={{ gap: "var(--site-grid-gap)" }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            className="site-card flex flex-col"
            data-hover-lift={theme.tokens.cards.hoverLift ? "true" : undefined}
            data-hover-scale={theme.tokens.cards.hoverScale ? "true" : undefined}
            style={cardStyle(theme)}
          >
            <div
              className="mb-5 flex h-10 w-10 items-center justify-center text-sm font-semibold"
              style={{
                background:
                  "color-mix(in srgb, var(--site-color-primary) 12%, transparent)",
                color: "var(--site-color-primary)",
                borderRadius: "var(--site-radius)",
              }}
              aria-hidden
            >
              {String(index + 1).padStart(2, "0")}
            </div>
            <h3
              className="text-lg font-semibold tracking-tight"
              style={{
                fontFamily: "var(--site-font-heading)",
                color: "var(--site-color-text)",
              }}
            >
              {String(item.title ?? "Feature")}
            </h3>
            <p
              className="mt-3 text-sm leading-relaxed sm:text-[0.9375rem]"
              style={{
                color: "var(--site-color-muted)",
                lineHeight: "var(--site-line-height)",
              }}
            >
              {String(item.description ?? "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CtaBlock({
  content,
  theme,
  basePath,
}: {
  content: Record<string, unknown>;
  theme: WebsiteTheme;
  basePath: string;
}) {
  const fg = readableOn(theme.tokens.colors.primary);
  return (
    <div
      className="relative overflow-hidden px-8 py-14 text-center sm:px-12 sm:py-16"
      style={{
        background: `linear-gradient(135deg, var(--site-color-primary), color-mix(in srgb, var(--site-color-primary) 70%, var(--site-color-secondary)))`,
        color: fg,
        borderRadius: "var(--site-radius-card)",
        boxShadow: "var(--site-shadow-card)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, color-mix(in srgb, var(--site-color-accent) 45%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-2xl">
        <h2
          className="tracking-tight"
          style={{
            fontFamily: "var(--site-font-heading)",
            fontSize: "var(--site-font-size-h2)",
            fontWeight: "var(--site-font-heading-weight)" as unknown as number,
            letterSpacing: "var(--site-letter-spacing)",
            lineHeight: 1.15,
          }}
        >
          {String(content.heading ?? "")}
        </h2>
        {content.body ? (
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed opacity-90">
            {String(content.body)}
          </p>
        ) : null}
        {content.buttonLabel ? (
          <Link
            href={hrefWithBase(basePath, String(content.buttonHref || "/"))}
            className="site-btn mt-8 inline-flex items-center px-6 py-3 text-sm font-semibold"
            data-hover={theme.tokens.buttons.hoverAnimation}
            style={{
              background: fg,
              color: "var(--site-color-primary)",
              borderRadius: buttonRadius(theme),
              fontFamily: "var(--site-font-button)",
              boxShadow: "var(--site-shadow-button)",
            }}
          >
            {String(content.buttonLabel)}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function CatalogBlock({
  content,
  theme,
  basePath,
}: {
  content: Record<string, unknown>;
  theme: WebsiteTheme;
  basePath: string;
}) {
  return (
    <div>
      {content.heading ? (
        <h2 className="mb-10 tracking-tight" style={sectionHeadingStyle(theme)}>
          {String(content.heading)}
        </h2>
      ) : null}
      <div
        className="grid sm:grid-cols-2 lg:grid-cols-3"
        style={{ gap: "var(--site-grid-gap)" }}
      >
        {asArray(content.items).map((item, index) => (
          <Link
            key={index}
            href={item.href ? hrefWithBase(basePath, String(item.href)) : "#"}
            className="site-card group overflow-hidden"
            data-hover-lift={theme.tokens.cards.hoverLift ? "true" : undefined}
            style={{
              ...cardStyle(theme),
              padding: 0,
            }}
          >
            {typeof item.mediaId === "string" && item.mediaId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaPublicUrl(item.mediaId, "medium")}
                alt={String(item.name ?? item.title ?? "Catalog item")}
                className="aspect-[16/10] h-auto w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div
                className="aspect-[16/10] w-full"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--site-color-primary) 18%, transparent), color-mix(in srgb, var(--site-color-accent) 22%, transparent))",
                }}
              />
            )}
            <div style={{ padding: "var(--site-card-padding)" }}>
              <h3
                className="text-lg font-semibold tracking-tight"
                style={{ fontFamily: "var(--site-font-heading)" }}
              >
                {String(item.name ?? item.title ?? "Item")}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--site-color-muted)" }}
              >
                {String(item.description ?? "")}
              </p>
              {item.price ? (
                <p
                  className="mt-4 text-sm font-semibold"
                  style={{ color: "var(--site-color-primary)" }}
                >
                  {String(item.price)}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
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
      ? "min-h-[340px] py-16 sm:py-20"
      : content.height === "lg"
        ? "min-h-[640px] py-24 sm:py-28"
        : content.height === "xl"
          ? "min-h-[85vh] py-28 sm:py-32"
          : "min-h-[520px] py-20 sm:py-24";
  const animationClass =
    content.animation === "rise"
      ? "animate-[fadeRise_800ms_ease-out]"
      : content.animation === "fade"
        ? "animate-[fadeIn_800ms_ease-out]"
        : "";
  const hasMedia = Boolean(desktopId || mobileId || videoUrl);
  const textColor = hasMedia
    ? "#ffffff"
    : "var(--site-color-text, " + theme.textColor + ")";
  const mutedColor = hasMedia
    ? "rgba(255,255,255,0.82)"
    : "var(--site-color-muted, " + theme.mutedColor + ")";
  const primaryFg = readableOn(theme.tokens.colors.primary);
  const isCentered = !align.includes("items-start") && !align.includes("items-end");
  const contentMax = isCentered ? "max-w-3xl" : "max-w-2xl";

  return (
    <div className={`relative overflow-hidden ${heightClass}`}>
      {!hasMedia ? (
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--site-color-primary) 14%, transparent), transparent 55%),
              radial-gradient(ellipse 50% 40% at 100% 100%, color-mix(in srgb, var(--site-color-accent) 12%, transparent), transparent 50%),
              linear-gradient(180deg, var(--site-color-background), color-mix(in srgb, var(--site-color-surface) 80%, var(--site-color-background)))
            `,
          }}
          aria-hidden
        />
      ) : null}

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
          src={mediaPublicUrl(desktopId, "large")}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${mobileId ? "hidden sm:block" : ""}`}
        />
      ) : null}
      {mobileId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaPublicUrl(mobileId, "large")}
          alt=""
          className="absolute inset-0 h-full w-full object-cover sm:hidden"
        />
      ) : null}
      {hasMedia ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              overlay > 0
                ? `linear-gradient(180deg, rgba(0,0,0,${overlay / 140}) 0%, rgba(0,0,0,${overlay / 100}) 55%, rgba(0,0,0,${Math.min(0.85, overlay / 90)}) 100%)`
                : "linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.45))",
          }}
        />
      ) : null}

      <div
        className={`relative z-10 mx-auto flex h-full w-full flex-col justify-center gap-5 px-5 sm:gap-6 sm:px-8 ${containerClass(theme)} ${align} ${animationClass}`}
        style={{ color: textColor }}
      >
        {content.eyebrow ? (
          <p
            className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] sm:text-xs"
            style={{ color: mutedColor }}
          >
            {String(content.eyebrow)}
          </p>
        ) : null}
        <h1
          className={`${contentMax} tracking-tight`}
          style={{
            fontFamily: "var(--site-font-heading, " + theme.fontHeading + ")",
            fontSize: "var(--site-font-size-h1)",
            fontWeight: "var(--site-font-heading-weight)" as unknown as number,
            letterSpacing: "var(--site-letter-spacing)",
            lineHeight: 1.05,
          }}
        >
          {String(content.heading ?? "")}
        </h1>
        {content.subheading ? (
          <p
            className={`${contentMax} text-base leading-relaxed sm:text-lg`}
            style={{
              color: mutedColor,
              lineHeight: "var(--site-line-height)",
              maxWidth: isCentered
                ? "var(--site-paragraph-width)"
                : undefined,
            }}
          >
            {String(content.subheading)}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-3 sm:gap-4">
          {content.primaryLabel ? (
            <Link
              href={hrefWithBase(basePath, String(content.primaryHref || "/"))}
              className="site-btn inline-flex items-center px-6 py-3 text-sm font-semibold"
              data-hover={theme.tokens.buttons.hoverAnimation}
              style={{
                background: "var(--site-color-primary, " + theme.primaryColor + ")",
                color: primaryFg,
                borderRadius: buttonRadius(theme),
                fontFamily: "var(--site-font-button, " + theme.fontBody + ")",
                boxShadow: "var(--site-shadow-button, none)",
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
              className="site-btn inline-flex items-center border px-6 py-3 text-sm font-semibold"
              data-hover={theme.tokens.buttons.hoverAnimation}
              style={{
                borderColor: hasMedia
                  ? "rgba(255,255,255,0.55)"
                  : "var(--site-color-border)",
                background: hasMedia
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
                color: hasMedia
                  ? "#ffffff"
                  : "var(--site-color-text, " + theme.textColor + ")",
                borderRadius: buttonRadius(theme),
                fontFamily: `var(--site-font-button, ${theme.fontBody})`,
                backdropFilter: hasMedia ? "blur(8px)" : undefined,
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
