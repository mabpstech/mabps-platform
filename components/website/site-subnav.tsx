"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavIcon =
  | "overview"
  | "pages"
  | "blog"
  | "forms"
  | "media"
  | "theme"
  | "header"
  | "footer"
  | "menu"
  | "seo"
  | "publish";

type NavLinkItem = { href: string; label: string; icon: NavIcon };

/** First-run essentials — website building without the full product dump. */
const PRIMARY_LINKS: NavLinkItem[] = [
  { href: "", label: "Overview", icon: "overview" },
  { href: "/pages", label: "Pages", icon: "pages" },
  { href: "/forms", label: "Forms", icon: "forms" },
  { href: "/media", label: "Media", icon: "media" },
  { href: "/publish", label: "Publish", icon: "publish" },
];

/** Still available; revealed on demand so first-time users stay focused. */
const MORE_GROUPS: {
  title: string;
  links: NavLinkItem[];
}[] = [
  {
    title: "Content",
    links: [{ href: "/blog", label: "Blog", icon: "blog" }],
  },
  {
    title: "Design",
    links: [
      { href: "/theme", label: "Theme Studio", icon: "theme" },
      { href: "/header", label: "Header", icon: "header" },
      { href: "/footer", label: "Footer", icon: "footer" },
      { href: "/navigation", label: "Menu", icon: "menu" },
    ],
  },
  {
    title: "Grow",
    links: [{ href: "/seo", label: "Search & SEO", icon: "seo" }],
  },
];

const ALL_LINKS = [
  ...PRIMARY_LINKS,
  ...MORE_GROUPS.flatMap((group) => group.links),
];

function NavGlyph({ icon }: { icon: NavIcon }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (icon) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "pages":
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "blog":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      );
    case "forms":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "media":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="1.5" />
          <path d="M3 16l5-4 4 3 3-2 6 4" />
        </svg>
      );
    case "theme":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16A8 8 0 0012 4z" />
        </svg>
      );
    case "header":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
        </svg>
      );
    case "footer":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 15h18" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      );
    case "seo":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      );
    case "publish":
      return (
        <svg {...common}>
          <path d="M12 16V5M7 9l5-4 5 4" />
          <path d="M5 19h14" />
        </svg>
      );
  }
}

function isLinkActive(pathname: string, base: string, href: string) {
  if (href === "") return pathname === base;
  const full = `${base}${href}`;
  return pathname === full || pathname.startsWith(`${full}/`);
}

function SubnavLink({
  base,
  link,
  pathname,
  compact = false,
}: {
  base: string;
  link: NavLinkItem;
  pathname: string;
  compact?: boolean;
}) {
  const href = `${base}${link.href}`;
  const active = isLinkActive(pathname, base, link.href);

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
          active
            ? "bg-zinc-900 text-white"
            : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
        }`}
      >
        <NavGlyph icon={link.icon} />
        {link.label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium tracking-[-0.01em] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2 ${
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
          active
            ? "bg-white/10 text-white"
            : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/70 group-hover:text-zinc-700"
        }`}
      >
        <NavGlyph icon={link.icon} />
      </span>
      {link.label}
    </Link>
  );
}

export function SiteSubnav({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const pathname = usePathname();
  const base = `/website/${siteId}`;
  const moreActive = MORE_GROUPS.some((group) =>
    group.links.some((link) => isLinkActive(pathname, base, link.href)),
  );
  const [showMore, setShowMore] = useState(moreActive);

  useEffect(() => {
    if (moreActive) setShowMore(true);
  }, [moreActive]);

  return (
    <aside className="w-full shrink-0 sm:sticky sm:top-4 sm:w-60 sm:self-start">
      <div className="space-y-4 sm:space-y-5">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Editing
          </p>
          <h2 className="mt-1.5 truncate text-[15px] font-semibold tracking-tight text-zinc-900">
            {siteName}
          </h2>
          <Link
            href="/website"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-zinc-500 transition hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            All websites
          </Link>
        </div>

        {/* Mobile: essentials first, then More */}
        <nav
          aria-label="Website sections"
          className="-mx-1 overflow-x-auto px-1 pb-1 sm:hidden"
        >
          <div className="flex min-w-max gap-1.5">
            {PRIMARY_LINKS.map((link) => (
              <SubnavLink
                key={link.href || "overview"}
                base={base}
                link={link}
                pathname={pathname}
                compact
              />
            ))}
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                showMore || moreActive
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600"
              }`}
              aria-expanded={showMore}
              onClick={() => setShowMore((current) => !current)}
            >
              More
            </button>
            {showMore
              ? ALL_LINKS.filter(
                  (link) =>
                    !PRIMARY_LINKS.some((primary) => primary.href === link.href),
                ).map((link) => (
                  <SubnavLink
                    key={link.href}
                    base={base}
                    link={link}
                    pathname={pathname}
                    compact
                  />
                ))
              : null}
          </div>
        </nav>

        {/* Desktop: essentials + progressive More */}
        <nav
          aria-label="Website sections"
          className="hidden space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.03)] sm:block"
        >
          <div className="px-1">
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Build
            </p>
            <div className="flex flex-col gap-0.5">
              {PRIMARY_LINKS.map((link) => (
                <SubnavLink
                  key={link.href || "overview"}
                  base={base}
                  link={link}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>

          <div className="px-1">
            <button
              type="button"
              className="mb-1.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
              aria-expanded={showMore}
              onClick={() => setShowMore((current) => !current)}
            >
              More tools
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className={`text-zinc-400 transition-transform ${
                  showMore ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {showMore ? (
              <div className="space-y-3">
                {MORE_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-300">
                      {group.title}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.links.map((link) => (
                        <SubnavLink
                          key={link.href}
                          base={base}
                          link={link}
                          pathname={pathname}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </aside>
  );
}
