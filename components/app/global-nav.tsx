"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type GlobalNavItem = {
  href: string;
  label: string;
};

function isItemActive(pathname: string, href: string) {
  // Settings siblings share a prefix; keep active state exclusive.
  if (href === "/settings/workspace") {
    if (pathname.startsWith("/settings/workspace/billing")) return false;
    return (
      pathname === "/settings/workspace" ||
      pathname.startsWith("/settings/workspace/")
    );
  }

  if (href === "/settings/workspace/billing") {
    return (
      pathname === "/settings/workspace/billing" ||
      pathname.startsWith("/settings/workspace/billing/")
    );
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GlobalNav({ items }: { items: GlobalNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Modules"
      className="hidden max-w-[min(100%,52rem)] flex-wrap items-center gap-0.5 sm:flex"
    >
      {items.map((item) => {
        const active = isItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={[
              "group relative rounded-full px-2.5 py-1.5 text-[13px] font-medium tracking-tight",
              "transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2",
              active
                ? "bg-zinc-900 text-white shadow-[0_1px_2px_rgba(24,24,27,0.28)]"
                : "text-zinc-500 hover:-translate-y-px hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-sm",
            ].join(" ")}
          >
            <span className="relative z-10">{item.label}</span>
            {!active ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2.5 -bottom-px h-px origin-left scale-x-0 bg-zinc-300 transition-transform duration-200 ease-out group-hover:scale-x-100"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
