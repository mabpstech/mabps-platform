"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BRAND, NAV_LINKS } from "@/lib/marketing/brand";

export function MarketingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={`m-header sticky top-0 z-50 transition-[background,box-shadow,border-color] duration-300 ${
        scrolled || open ? "m-header-solid" : "m-header-clear"
      }`}
    >
      <div className="m-container flex h-16 items-center justify-between gap-4 md:h-[4.25rem]">
        <Link
          href="/"
          className="relative z-10 flex items-baseline gap-2"
          onClick={() => setOpen(false)}
          aria-label={`${BRAND.name} home`}
        >
          <span className="m-display text-[1.65rem] leading-none tracking-[-0.04em] text-[var(--m-ink)]">
            {BRAND.name}
          </span>
          <span className="hidden text-[0.7rem] font-medium tracking-[0.08em] text-[var(--m-muted)] uppercase sm:inline">
            {BRAND.tagline}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`m-nav-link ${isActive(link.href) ? "m-nav-link-active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="m-btn m-btn-secondary !min-h-10 !px-4 !text-sm">
            Login
          </Link>
          <Link href="/signup" className="m-btn m-btn-primary !min-h-10 !px-4 !text-sm">
            Start Free
          </Link>
        </div>

        <button
          type="button"
          className="relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--m-line-strong)] bg-[var(--m-surface-elevated)]/60 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className="flex w-4 flex-col gap-1.5">
            <span
              className={`h-px w-full bg-[var(--m-ink)] transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-full bg-[var(--m-ink)] transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </span>
        </button>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="m-mobile-nav border-t border-[var(--m-line)] bg-[var(--m-surface)] lg:hidden"
        >
          <nav className="m-container flex flex-col gap-1 py-4" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-[var(--m-accent-soft)] text-[var(--m-ink)]"
                    : "text-[var(--m-ink)] hover:bg-white/70"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-[var(--m-line)] pt-4">
              <Link
                href="/login"
                className="m-btn m-btn-secondary w-full"
                onClick={() => setOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="m-btn m-btn-primary w-full"
                onClick={() => setOpen(false)}
              >
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
