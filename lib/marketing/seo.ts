import type { Metadata } from "next";
import { BRAND } from "@/lib/marketing/brand";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || BRAND.url;

export function absoluteUrl(path = "/"): string {
  const base = SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const fullTitle =
    title === BRAND.name ? `${BRAND.name} — ${BRAND.tagline}` : `${title} · ${BRAND.name}`;
  const url = absoluteUrl(path);

  return {
    title: { absolute: fullTitle },
    description,
    metadataBase: new URL(absoluteUrl("/")),
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: BRAND.company,
      title: fullTitle,
      description,
      images: [{ url: absoluteUrl("/opengraph-image"), width: 1200, height: 630, alt: BRAND.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.company,
    legalName: BRAND.company,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/opengraph-image"),
    description: BRAND.description,
    email: BRAND.email.hello,
    sameAs: [BRAND.social.twitter, BRAND.social.linkedin, BRAND.social.github],
    slogan: BRAND.tagline,
  };
}

export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: BRAND.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan available",
    },
    provider: {
      "@type": "Organization",
      name: BRAND.company,
    },
  };
}

export function faqJsonLd(
  items: ReadonlyArray<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
