import Link from "next/link";
import type { ReactNode } from "react";

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
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow ? (
        <p className={`m-eyebrow ${align === "center" ? "justify-center before:hidden" : ""}`}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={`m-section-title m-display ${eyebrow ? "mt-4" : ""}`}>{title}</h2>
      {lead ? <p className={`m-section-lead ${align === "center" ? "mx-auto" : ""}`}>{lead}</p> : null}
    </div>
  );
}
