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
  if (preset === "wide") return "max-w-6xl";
  if (preset === "full") return "max-w-none";
  return "max-w-5xl";
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
                    src={mediaPublicUrl(logoMediaId)}
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
            className={`hidden items-center gap-5 text-sm md:flex ${
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
            {navigation.map((item) => (
              <Link
                key={item.id}
                href={resolveHref(basePath, item.href)}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noreferrer" : undefined}
                className="opacity-80 transition hover:opacity-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {header.showSearch ? (
              <span
                className="hidden rounded-md border px-2 py-1 text-xs opacity-70 sm:inline"
                title="Search"
                style={{ borderColor: "var(--site-color-border)" }}
              >
                Search
              </span>
            ) : null}
            {header.showCart ? (
              <span
                className="hidden rounded-md border px-2 py-1 text-xs opacity-70 sm:inline"
                title="Cart"
                style={{ borderColor: "var(--site-color-border)" }}
              >
                Cart
              </span>
            ) : null}
            {header.ctaLabel ? (
              <Link
                href={resolveHref(basePath, header.ctaHref)}
                className="hidden px-3 py-1.5 text-sm font-medium sm:inline-flex"
                style={ctaStyle(header, theme)}
              >
                {header.ctaLabel}
              </Link>
            ) : null}
            <button
              type="button"
              className="rounded-md border px-2.5 py-1.5 text-xs font-medium md:hidden"
              style={{ borderColor: "var(--site-color-border)", color: headerFg }}
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
              {navigation.map((item) => (
                <Link
                  key={item.id}
                  href={resolveHref(basePath, item.href)}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noreferrer" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="opacity-90"
                >
                  {item.label}
                </Link>
              ))}
              {header.ctaLabel ? (
                <Link
                  href={resolveHref(basePath, header.ctaHref)}
                  onClick={() => setMobileOpen(false)}
                  className="mt-1 inline-flex w-fit px-3 py-1.5 text-sm font-medium"
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
        className="mt-16 border-t"
        style={{
          background: footerBg,
          color: footerFg,
          boxShadow: "var(--site-shadow-footer)",
          borderColor: "var(--site-color-border)",
        }}
      >
        <div
          className={`mx-auto grid w-full gap-8 px-6 py-12 sm:grid-cols-2 ${
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
            <p>{footer.copyrightText}</p>
          ) : (
            <span />
          )}
          {footer.showSocial || tokens.footer.showSocial ? (
            <div className="flex flex-wrap gap-3">
              {footer.socialLinks.map((link) => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
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
