"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  {
    title: "Build",
    links: [
      { href: "", label: "Overview" },
      { href: "/pages", label: "Pages" },
      { href: "/blog", label: "Blog" },
      { href: "/forms", label: "Forms" },
      { href: "/media", label: "Media" },
    ],
  },
  {
    title: "Design",
    links: [
      { href: "/theme", label: "Theme" },
      { href: "/header", label: "Header" },
      { href: "/footer", label: "Footer" },
      { href: "/navigation", label: "Menu" },
    ],
  },
  {
    title: "Grow",
    links: [
      { href: "/seo", label: "Search & SEO" },
      { href: "/publish", label: "Publish" },
    ],
  },
] as const;

export function SiteSubnav({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const pathname = usePathname();
  const base = `/website/${siteId}`;

  return (
    <aside className="w-full shrink-0 space-y-6 sm:w-56">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400">
          Editing
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-zinc-900">
          {siteName}
        </h2>
        <Link
          href="/website"
          className="mt-3 inline-block text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          ← All websites
        </Link>
      </div>

      <nav className="space-y-5">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {group.title}
            </p>
            <div className="flex flex-row flex-wrap gap-1 sm:flex-col">
              {group.links.map((link) => {
                const href = `${base}${link.href}`;
                const active =
                  link.href === ""
                    ? pathname === base
                    : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={link.href}
                    href={href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
