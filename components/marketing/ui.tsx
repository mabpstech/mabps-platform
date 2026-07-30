import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent";

const variantClass: Record<Variant, string> = {
  primary: "m-btn-primary",
  secondary: "m-btn-secondary",
  accent: "m-btn-accent",
};

/** Reusable page-width container for marketing layouts. */
export function MarketingContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`m-container ${className}`.trim()}>{children}</div>;
}

/** Reusable vertical section with consistent marketing spacing. */
export function MarketingSection({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`m-section ${className}`.trim()}>
      {children}
    </section>
  );
}

export function MarketingButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={`m-btn ${variantClass[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  as = "h2",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const TitleTag = as;
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? (
        <p className={`m-eyebrow ${align === "center" ? "justify-center before:hidden" : ""}`}>
          {eyebrow}
        </p>
      ) : null}
      <TitleTag className={`m-section-title m-display ${eyebrow ? "mt-4" : ""}`}>
        {title}
      </TitleTag>
      {lead ? <p className={`m-section-lead ${align === "center" ? "mx-auto" : ""}`}>{lead}</p> : null}
    </div>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Professional line icons for marketing feature grids. */
export function FeatureIcon({ id }: { id: string }) {
  switch (id) {
    case "website-builder":
      return (
        <svg {...iconProps}>
          <rect x="3" y="4" width="18" height="14" rx="2" />
          <path d="M3 8h18M8 18v2M16 18v2M10 18h4" />
        </svg>
      );
    case "crm":
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M3 19c0-2.8 2.7-5 6-5s6 2.2 6 5" />
          <path d="M14.5 19c.3-1.8 1.8-3.2 3.8-3.5 1.7.2 3.2 1.4 3.7 3.5" />
        </svg>
      );
    case "ai-assistant":
      return (
        <svg {...iconProps}>
          <path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
          <path d="M5 15l.7 2.1L8 18l-2.3.8L5 21l-.7-2.2L2 18l2.3-.9L5 15z" />
          <path d="M18 14l.8 2.3L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.7L18 14z" />
        </svg>
      );
    case "automation":
      return (
        <svg {...iconProps}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="12" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M8.5 7.2 15.5 11M8.5 16.8 15.5 13" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...iconProps}>
          <path d="M4 19V5M4 19h16" />
          <path d="M8 15v-4M12 15V8M16 15v-7" />
        </svg>
      );
    case "knowledge":
      return (
        <svg {...iconProps}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5z" />
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5A2.5 2.5 0 0 1 20 21.5V5.5z" />
        </svg>
      );
    case "memory":
      return (
        <svg {...iconProps}>
          <path d="M12 3a7 7 0 0 1 7 7c0 4.2-3.2 6.8-7 11-3.8-4.2-7-6.8-7-11a7 7 0 0 1 7-7z" />
          <circle cx="12" cy="10" r="2.25" />
        </svg>
      );
    case "marketplace":
      return (
        <svg {...iconProps}>
          <path d="M4 8h16l-1.2 11.2A2 2 0 0 1 16.8 21H7.2a2 2 0 0 1-2-1.8L4 8z" />
          <path d="M8 8V6.5A4 4 0 0 1 12 2.5 4 4 0 0 1 16 6.5V8" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
}

/** Interactive feature tile used on the homepage grid. */
export function FeatureCard({
  id,
  title,
  description,
  href,
  className = "",
  style,
}: {
  id: string;
  title: string;
  description: string;
  href: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <article
      className={`m-card m-card-interactive m-animate-in flex flex-col p-6 ${className}`.trim()}
      style={style}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--m-accent-soft)] text-[var(--m-accent)]">
        <FeatureIcon id={id} />
      </div>
      <h3 className="mt-5 text-xl tracking-tight text-[var(--m-ink)]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--m-muted)]">{description}</p>
      <Link
        href={href}
        aria-label={`Learn more about ${title}`}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--m-accent)] transition-colors hover:text-[var(--m-accent-deep)]"
      >
        Learn More
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}

/** Industry solution tile linking into the solutions page. */
export function SolutionCard({
  id,
  title,
  description,
  className = "",
  style,
}: {
  id: string;
  title: string;
  description: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Link
      href={`/solutions#${id}`}
      className={`m-card m-card-interactive m-animate-in block p-6 md:p-7 ${className}`.trim()}
      style={style}
    >
      <h3 className="text-xl tracking-tight text-[var(--m-ink)]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[var(--m-muted)]">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--m-accent)]">
        Explore
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
