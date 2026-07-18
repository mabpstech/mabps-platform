"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "", label: "Overview" },
  { href: "/pages", label: "Pages" },
  { href: "/theme", label: "Theme" },
  { href: "/header", label: "Header" },
  { href: "/footer", label: "Footer" },
  { href: "/navigation", label: "Navigation" },
  { href: "/seo", label: "SEO" },
  { href: "/blog", label: "Blog" },
  { href: "/media", label: "Media" },
  { href: "/forms", label: "Forms" },
  { href: "/publish", label: "Publish" },
] as const;

export function SiteSubnav({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  const pathname = usePathname();
  const base = `/sites/${siteId}`;

  return (
    <aside className="w-full shrink-0 space-y-4 sm:w-52">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Site
        </p>
        <h2 className="mt-1 truncate text-sm font-semibold text-zinc-900">
          {siteName}
        </h2>
      </div>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => {
          const href = `${base}${link.href}`;
          const active =
            link.href === ""
              ? pathname === base
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={link.href}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href="/sites"
        className="inline-block text-sm text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
      >
        All sites
      </Link>
    </aside>
  );
}
