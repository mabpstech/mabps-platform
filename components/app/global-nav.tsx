"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
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

function NavLink({
  item,
  pathname,
  onNavigate,
  compact = false,
}: {
  item: GlobalNavItem;
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const active = isItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={[
        "group relative font-medium tracking-tight transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2",
        compact
          ? "block rounded-xl px-3 py-2.5 text-sm"
          : "rounded-full px-2.5 py-1.5 text-[13px]",
        active
          ? compact
            ? "bg-zinc-900 text-white"
            : "bg-zinc-900 text-white shadow-[0_1px_2px_rgba(24,24,27,0.28)]"
          : compact
            ? "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            : "text-zinc-500 hover:-translate-y-px hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-sm",
      ].join(" ")}
    >
      <span className="relative z-10">{item.label}</span>
      {!active && !compact ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2.5 -bottom-px h-px origin-left scale-x-0 bg-zinc-300 transition-transform duration-200 ease-out group-hover:scale-x-100"
        />
      ) : null}
    </Link>
  );
}

export function GlobalNav({ items }: { items: GlobalNavItem[] }) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <nav
        aria-label="Modules"
        className="hidden max-w-[min(100%,52rem)] flex-wrap items-center gap-0.5 sm:flex"
      >
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="sm:hidden">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-offset-2"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-zinc-950/25"
              aria-label="Close navigation menu"
              onClick={() => setOpen(false)}
            />
            <nav
              id={menuId}
              aria-label="Modules"
              className="absolute left-4 right-4 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
            >
              <div className="grid gap-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    compact
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </div>
            </nav>
          </>
        ) : null}
      </div>
    </>
  );
}
