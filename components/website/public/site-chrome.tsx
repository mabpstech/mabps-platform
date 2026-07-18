import Link from "next/link";
import { mediaPublicUrl } from "@/lib/website/public";
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
  const headerBg = header.backgroundColor || theme.backgroundColor;
  const headerFg = header.textColor || theme.textColor;
  const footerBg = footer.backgroundColor || theme.secondaryColor;
  const footerFg = footer.textColor || "#ffffff";

  return (
    <div
      className="min-h-screen"
      style={{
        background: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontBody,
      }}
    >
      {theme.customCss ? <style>{theme.customCss}</style> : null}
      <header
        className={header.sticky ? "sticky top-0 z-20 border-b" : "border-b"}
        style={{
          background: headerBg,
          color: headerFg,
          borderColor: "rgba(0,0,0,0.08)",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            {header.showLogo ? (
              header.logoMediaId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaPublicUrl(header.logoMediaId)}
                  alt={header.logoText || siteName}
                  className="h-8 w-auto"
                />
              ) : (
                <Link
                  href={basePath || "/"}
                  className="text-lg font-semibold"
                  style={{ fontFamily: theme.fontHeading }}
                >
                  {header.logoText || siteName}
                </Link>
              )
            ) : null}
          </div>
          <nav className="hidden items-center gap-4 text-sm md:flex">
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
          {header.ctaLabel ? (
            <Link
              href={resolveHref(basePath, header.ctaHref)}
              className="px-3 py-1.5 text-sm font-medium text-white"
              style={{
                background: theme.primaryColor,
                borderRadius: theme.borderRadius,
              }}
            >
              {header.ctaLabel}
            </Link>
          ) : null}
        </div>
      </header>

      <main>{children}</main>

      <footer
        className="mt-16 border-t"
        style={{ background: footerBg, color: footerFg }}
      >
        <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {footer.columns.map((column, index) => (
            <div key={`${column.title}-${index}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wide">
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
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 pb-8 text-sm opacity-80">
          <p>{footer.copyrightText}</p>
          {footer.showSocial ? (
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
