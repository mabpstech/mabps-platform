"use client";

import Link from "next/link";
import { useState } from "react";
import { mediaPublicUrl } from "@/lib/website/media-url";
import {
  cssVarsToInlineStyle,
  googleFontsUrlForStacks,
  readableOn,
  themeTokensToCssVars,
  themeTokensToStyleTag,
} from "@/lib/website/theme";
import type {
  WebsiteFooter,
  WebsiteHeader,
  WebsiteNavItem,
  WebsiteTheme,
} from "@/lib/website/types";

function resolveHref(basePath: string, href: string | null): string {
  if (!href || href === "/") return basePath || "/";
  if (href.startsWith("http")) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${basePath}${path}`;
}

function logoHeight(size?: WebsiteHeader["logoSize"]): string {
  if (size === "sm") return "h-6";
  if (size === "lg") return "h-12";
  return "h-8";
}

function containerClass(preset: string): string {
  if (preset === "narrow") return "max-w-3xl";
  if (preset === "wide") return "max-w-7xl";
  if (preset === "full") return "max-w-none";
  return "max-w-6xl";
}

export function SiteChrome({
  theme,
  header,
  footer,
  navigation,
  basePath,
  siteName,
  children,
}: {
  theme: WebsiteTheme;
  header: WebsiteHeader;
  footer: WebsiteFooter;
  navigation: WebsiteNavItem[];
  basePath: string;
  siteName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tokens = theme.tokens;
  const vars = themeTokensToCssVars(tokens);
  const rootStyle = {
    ...cssVarsToInlineStyle(vars),
    background: "var(--site-color-background)",
    color: "var(--site-color-text)",
    fontFamily: "var(--site-font-body)",
  } as React.CSSProperties;

  const headerStyleToken = tokens.header.style;
  const sticky =
    header.sticky ||
    headerStyleToken === "sticky" ||
    headerStyleToken === "glass";
  const headerBg =
    header.backgroundColor ||
    (headerStyleToken === "transparent"
      ? "transparent"
      : headerStyleToken === "glass"
        ? undefined
        : theme.backgroundColor);
  const headerFg = header.textColor || theme.textColor;
  const footerBg =
    footer.backgroundColor ||
    tokens.footer.background ||
    theme.secondaryColor;
  const footerFg = footer.textColor || readableOn(footerBg);
  const logoMediaId = header.logoMediaId || tokens.brand.logoMediaId;
  const displayName =
    tokens.brand.businessName || header.logoText || siteName;
  const shellWidth = containerClass(tokens.sections.containerPreset);
  const fontsUrl = googleFontsUrlForStacks([
    tokens.typography.headingFont,
    tokens.typography.bodyFont,
    tokens.typography.buttonFont,
    tokens.typography.navigationFont,
  ]);

  const headerSurfaceStyle: React.CSSProperties = {
    background:
      headerStyleToken === "glass"
        ? "color-mix(in srgb, var(--site-color-surface) 82%, transparent)"
        : headerBg,
    color: headerFg,
    borderColor: "var(--site-color-border)",
    boxShadow: tokens.header.shadow ? "var(--site-shadow-nav)" : undefined,
    backdropFilter: headerStyleToken === "glass" ? "blur(12px)" : undefined,
  };

  const navPad =
    tokens.header.navHeight === "sm"
      ? "py-2.5"
      : tokens.header.navHeight === "lg"
        ? "py-5"
        : "py-4";

  return (
    <div className="mabps-site min-h-screen" style={rootStyle}>
      <style>{themeTokensToStyleTag(tokens)}</style>
      {fontsUrl ? (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href={fontsUrl} />
      ) : null}
      {theme.customCss ? <style>{theme.customCss}</style> : null}

      {(header.announcementEnabled && header.announcementText) ||
      (tokens.header.announcementBar && header.announcementText) ? (
        <div
          className="px-4 py-2 text-center text-xs font-medium"
          style={{
            background: "var(--site-color-primary)",
            color: readableOn(tokens.colors.primary),
          }}
        >
          {header.announcementText}
        </div>
      ) : null}

      <header
        className={sticky ? "sticky top-0 z-20 border-b" : "border-b"}
        style={headerSurfaceStyle}
      >
        <div
          className={`mx-auto flex w-full items-center justify-between gap-4 px-6 ${navPad} ${shellWidth}`}
        >
          <div
            className={`flex items-center gap-3 ${
              tokens.header.logoPosition === "center" ? "flex-1 justify-center md:justify-start" : ""
            }`}
          >
            {header.showLogo ? (
              logoMediaId ? (
                <Link href={basePath || "/"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaPublicUrl(logoMediaId, "medium")}
                    alt={displayName}
                    className={`${logoHeight(header.logoSize)} w-auto`}
                    style={{ borderRadius: "var(--site-radius-image)" }}
                  />
                </Link>
              ) : (
                <Link
                  href={basePath || "/"}
                  className="text-lg font-semibold"
                  style={{
                    fontFamily: "var(--site-font-heading)",
                    fontWeight: "var(--site-font-heading-weight)" as unknown as number,
                  }}
                >
                  {displayName}
                </Link>
              )
            ) : null}
          </div>

          <nav
            className={`hidden items-center gap-7 text-[0.8125rem] font-medium tracking-wide md:flex ${
              tokens.header.menuAlignment === "center"
                ? "flex-1 justify-center"
                : tokens.header.menuAlignment === "left"
                  ? "mr-auto"
                  : ""
            }`}
            style={{
              fontFamily: "var(--site-font-nav)",
              color: "var(--site-color-text-secondary)",
            }}
          >
            {groupNavigation(navigation).map((group) =>
              group.children.length === 0 ? (
                <Link
                  key={group.parent.id}
                  href={resolveHref(basePath, group.parent.href)}
                  target={group.parent.openInNewTab ? "_blank" : undefined}
                  rel={group.parent.openInNewTab ? "noreferrer" : undefined}
                  className="site-nav-link opacity-75"
                >
                  {group.parent.label}
                </Link>
              ) : (
                <div key={group.parent.id} className="group relative">
                  <Link
                    href={resolveHref(basePath, group.parent.href)}
                    target={group.parent.openInNewTab ? "_blank" : undefined}
                    rel={group.parent.openInNewTab ? "noreferrer" : undefined}
                    className="site-nav-link inline-flex items-center gap-1 opacity-75"
                    aria-haspopup="menu"
                  >
                    {group.parent.label}
                    <span aria-hidden className="text-[10px] opacity-60">
                      ▾
                    </span>
                  </Link>
                  <div
                    className="invisible absolute left-0 top-full z-30 min-w-[12rem] pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                    role="menu"
                  >
                    <div
                      className="rounded-xl border py-1.5 shadow-lg"
                      style={{
                        background: "var(--site-color-surface, #fff)",
                        borderColor: "var(--site-color-border)",
                        color: "var(--site-color-text)",
                        boxShadow: "var(--site-shadow-dropdown)",
                        borderRadius: "var(--site-radius-card)",
                      }}
                    >
                      {group.children.map((child) => (
                        <Link
                          key={child.id}
                          href={resolveHref(basePath, child.href)}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noreferrer" : undefined}
                          className="block px-3.5 py-2 text-sm opacity-80 transition hover:opacity-100"
                          role="menuitem"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2.5">
            {header.ctaLabel ? (
              <Link
                href={resolveHref(basePath, header.ctaHref)}
                className="site-btn hidden px-4 py-2 text-sm font-semibold sm:inline-flex"
                data-hover={theme.tokens.buttons.hoverAnimation}
                style={ctaStyle(header, theme)}
              >
                {header.ctaLabel}
              </Link>
            ) : null}
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-xs font-semibold md:hidden"
              style={{
                borderColor: "var(--site-color-border)",
                color: headerFg,
                borderRadius: "var(--site-radius-button)",
              }}
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label="Open menu"
            >
              Menu
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div
            className="border-t px-6 py-4 md:hidden"
            style={{ borderColor: "var(--site-color-border)" }}
          >
            <nav className="flex flex-col gap-3 text-sm">
              {groupNavigation(navigation).map((group) => (
                <div key={group.parent.id} className="space-y-2">
                  <Link
                    href={resolveHref(basePath, group.parent.href)}
                    target={group.parent.openInNewTab ? "_blank" : undefined}
                    rel={group.parent.openInNewTab ? "noreferrer" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className="opacity-90"
                  >
                    {group.parent.label}
                  </Link>
                  {group.children.length > 0 ? (
                    <div className="ml-3 flex flex-col gap-2 border-l pl-3">
                      {group.children.map((child) => (
                        <Link
                          key={child.id}
                          href={resolveHref(basePath, child.href)}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noreferrer" : undefined}
                          onClick={() => setMobileOpen(false)}
                          className="opacity-80"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {header.ctaLabel ? (
                <Link
                  href={resolveHref(basePath, header.ctaHref)}
                  onClick={() => setMobileOpen(false)}
                  className="site-btn mt-2 inline-flex w-fit px-4 py-2 text-sm font-semibold"
                  data-hover={theme.tokens.buttons.hoverAnimation}
                  style={ctaStyle(header, theme)}
                >
                  {header.ctaLabel}
                </Link>
              ) : null}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer
        className="mt-20 border-t sm:mt-24"
        style={{
          background: footerBg,
          color: footerFg,
          boxShadow: "var(--site-shadow-footer)",
          borderColor: "var(--site-color-border)",
        }}
      >
        <div
          className={`mx-auto grid w-full gap-10 px-6 py-14 sm:grid-cols-2 ${
            tokens.footer.columns <= 2
              ? "lg:grid-cols-2"
              : tokens.footer.columns === 3
                ? "lg:grid-cols-3"
                : "lg:grid-cols-4"
          } ${shellWidth}`}
        >
          {footer.columns.map((column, index) => (
            <div key={`${column.title}-${index}`}>
              <h3
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ fontFamily: "var(--site-font-heading)" }}
              >
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm opacity-90">
                {column.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <Link href={resolveHref(basePath, link.href)}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className={`mx-auto flex w-full flex-wrap items-center justify-between gap-3 px-6 pb-8 text-sm opacity-80 ${shellWidth}`}
        >
          {tokens.footer.showCopyright !== false ? (
            <p>{withCurrentCopyrightYear(footer.copyrightText)}</p>
          ) : (
            <span />
          )}
          {footer.showSocial || tokens.footer.showSocial ? (
            <div className="flex flex-wrap gap-3">
              {footer.socialLinks.map((link) => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={sanitizeExternalHref(link.href)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <span aria-hidden>{socialGlyph(link.label)}</span>
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function groupNavigation(navigation: WebsiteNavItem[]) {
  const parents = navigation.filter((item) => !item.parentId);
  const childrenByParent = new Map<string, WebsiteNavItem[]>();
  for (const item of navigation) {
    if (!item.parentId) continue;
    const list = childrenByParent.get(item.parentId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentId, list);
  }
  const grouped = parents.map((parent) => ({
    parent,
    children: childrenByParent.get(parent.id) ?? [],
  }));
  // Keep orphaned children reachable as top-level links.
  for (const item of navigation) {
    if (item.parentId && !parents.some((parent) => parent.id === item.parentId)) {
      grouped.push({ parent: item, children: [] });
    }
  }
  return grouped;
}

function sanitizeExternalHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return trimmed;
  return "#";
}

/** Keep © YYYY current even when copyright was baked in at site create time. */
function withCurrentCopyrightYear(text: string | null): string {
  if (!text) return "";
  const year = new Date().getFullYear();
  return text.replace(/©\s*\d{4}/g, `© ${year}`);
}

function socialGlyph(label: string): string {
  const key = label.trim().toLowerCase();
  if (key.includes("instagram")) return "◎";
  if (key.includes("facebook")) return "f";
  if (key.includes("linkedin")) return "in";
  if (key.includes("youtube")) return "▶";
  if (key.includes("tiktok")) return "♪";
  if (key.includes("whatsapp")) return "☎";
  if (key === "x" || key.includes("twitter")) return "𝕏";
  return "↗";
}

function ctaStyle(header: WebsiteHeader, theme: WebsiteTheme) {
  const radius =
    theme.tokens.buttons.shape === "pill"
      ? "9999px"
      : theme.tokens.buttons.shape === "square"
        ? "0px"
        : theme.tokens.borders.buttonRadius || theme.borderRadius;
  const fontFamily = theme.tokens.typography.buttonFont || theme.fontBody;

  if (header.ctaStyle === "outline") {
    return {
      background: "transparent",
      color: "var(--site-color-primary)",
      border: "1px solid var(--site-color-primary)",
      borderRadius: radius,
      fontFamily,
      boxShadow: "var(--site-shadow-button)",
    };
  }
  if (header.ctaStyle === "secondary") {
    return {
      background: "var(--site-color-secondary)",
      color: readableOn(theme.tokens.colors.secondary),
      borderRadius: radius,
      fontFamily,
      boxShadow: "var(--site-shadow-button)",
    };
  }
  return {
    background: "var(--site-color-primary)",
    color: readableOn(theme.tokens.colors.primary),
    borderRadius: radius,
    fontFamily,
    boxShadow: "var(--site-shadow-button)",
  };
}
