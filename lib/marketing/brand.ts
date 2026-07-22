/** Official MABPS Technologies brand system */

export const BRAND = {
  name: "MABPS",
  company: "MABPS Technologies",
  tagline: "Build. Automate. Grow.",
  description:
    "MABPS is the connected business platform for websites, CRM, AI, automation, and growth — built for modern companies that want one system instead of ten tools.",
  url: "https://mabps.com",
  email: {
    hello: "hello@mabps.com",
    support: "support@mabps.com",
    sales: "sales@mabps.com",
  },
  social: {
    twitter: "https://twitter.com/mabps",
    linkedin: "https://www.linkedin.com/company/mabps",
    github: "https://github.com/mabps",
  },
} as const;

/** Primary marketing navigation (logo + these links + Login / Start Free). */
export const NAV_LINKS = [
  { label: "Platform", href: "/platform" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Start Free", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Book a demo", href: "/contact?intent=demo" },
      { label: "Support", href: "mailto:support@mabps.com" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Resources", href: "/resources" },
      { label: "Platform overview", href: "/platform" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/resources#privacy" },
      { label: "Terms", href: "/resources#terms" },
      { label: "Cookies", href: "/resources#cookies" },
    ],
  },
] as const;

export const SOCIAL_LINKS = [
  { label: "X", href: BRAND.social.twitter },
  { label: "LinkedIn", href: BRAND.social.linkedin },
  { label: "GitHub", href: BRAND.social.github },
] as const;
