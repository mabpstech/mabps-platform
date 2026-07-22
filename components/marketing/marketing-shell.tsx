import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { MarketingNav } from "@/components/marketing/site-nav";
import { organizationJsonLd, softwareJsonLd } from "@/lib/marketing/seo";
import "@/app/marketing.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

/** Shared marketing chrome: fonts, sticky nav, page body, footer. */
export function MarketingShell({ children }: { children: ReactNode }) {
  const schemas = [organizationJsonLd(), softwareJsonLd()];

  return (
    <div
      className={`mabps-marketing ${plusJakarta.variable} ${instrument.variable} flex min-h-full flex-1 flex-col`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
