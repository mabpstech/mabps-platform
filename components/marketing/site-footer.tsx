import Link from "next/link";
import { BRAND, FOOTER_COLUMNS, SOCIAL_LINKS } from "@/lib/marketing/brand";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="m-footer border-t border-[var(--m-line)] bg-[var(--m-ink)] text-white">
      <div className="m-container py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <p className="m-display text-3xl tracking-[-0.04em]">{BRAND.name}</p>
            <p className="mt-2 text-sm font-medium tracking-[0.12em] text-white/55 uppercase">
              {BRAND.tagline}
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">
              {BRAND.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <a
                href={`mailto:${BRAND.email.hello}`}
                className="text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                {BRAND.email.hello}
              </a>
              <span className="text-white/25" aria-hidden>
                ·
              </span>
              <a
                href={`mailto:${BRAND.email.support}`}
                className="text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Support
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <p className="m-footer-heading">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.label}`}>
                      {link.href.startsWith("mailto:") ? (
                        <a href={link.href} className="m-footer-link">
                          {link.label}
                        </a>
                      ) : (
                        <Link href={link.href} className="m-footer-link">
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            © {year} {BRAND.company}. All rights reserved.
          </p>
          <nav className="flex gap-5 text-sm text-white/55" aria-label="Social">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-white"
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
