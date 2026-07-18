import type {
  ButtonStyle,
  FooterColumn,
  FooterSocialLink,
  PageType,
  SectionType,
} from "@/lib/website/types";

export const DEFAULT_THEME = {
  primaryColor: "#18181b",
  secondaryColor: "#3f3f46",
  backgroundColor: "#ffffff",
  textColor: "#18181b",
  mutedColor: "#71717a",
  fontHeading: "Georgia, 'Times New Roman', serif",
  fontBody: "ui-sans-serif, system-ui, sans-serif",
  borderRadius: "0.5rem",
  buttonStyle: "primary" as ButtonStyle,
  logoMediaId: null as string | null,
  faviconMediaId: null as string | null,
  customCss: null as string | null,
};

export const DEFAULT_HEADER = {
  logoText: null as string | null,
  logoMediaId: null as string | null,
  showLogo: true,
  sticky: true,
  backgroundColor: null as string | null,
  textColor: null as string | null,
  ctaLabel: "Get started",
  ctaHref: "/contact",
  ctaStyle: "primary" as ButtonStyle,
};

export const DEFAULT_FOOTER = {
  copyrightText: null as string | null,
  showSocial: false,
  socialLinks: [] as FooterSocialLink[],
  columns: [] as FooterColumn[],
  backgroundColor: null as string | null,
  textColor: null as string | null,
};

export const DEFAULT_SEO = {
  defaultTitle: null as string | null,
  defaultDescription: null as string | null,
  ogImageMediaId: null as string | null,
  twitterHandle: null as string | null,
  robots: "index,follow",
  canonicalBaseUrl: null as string | null,
  jsonLd: null as string | null,
};

export type DefaultPageSeed = {
  title: string;
  slug: string;
  pageType: PageType;
  sortOrder: number;
  sections: Array<{
    type: SectionType;
    content: Record<string, unknown>;
  }>;
};

export function buildDefaultPages(siteName: string): DefaultPageSeed[] {
  return [
    {
      title: "Home",
      slug: "home",
      pageType: "home",
      sortOrder: 0,
      sections: [
        {
          type: "hero",
          content: {
            eyebrow: siteName,
            heading: `Welcome to ${siteName}`,
            subheading:
              "Build your presence with pages, products, collections, and a blog — all in one place.",
            primaryLabel: "Explore products",
            primaryHref: "/products",
            secondaryLabel: "Contact us",
            secondaryHref: "/contact",
            align: "center",
          },
        },
        {
          type: "features",
          content: {
            heading: "Why choose us",
            items: [
              {
                title: "Quality first",
                description: "Carefully curated products and collections.",
              },
              {
                title: "Clear communication",
                description: "Reach us anytime through the contact form.",
              },
              {
                title: "Fresh content",
                description: "Stories and updates from our blog.",
              },
            ],
          },
        },
        {
          type: "cta",
          content: {
            heading: "Ready to get started?",
            body: "Tell us what you need — we typically respond within one business day.",
            buttonLabel: "Contact",
            buttonHref: "/contact",
          },
        },
      ],
    },
    {
      title: "About",
      slug: "about",
      pageType: "about",
      sortOrder: 1,
      sections: [
        {
          type: "hero",
          content: {
            heading: `About ${siteName}`,
            subheading: "Our story, values, and the people behind the brand.",
            align: "left",
          },
        },
        {
          type: "richText",
          content: {
            html: `<p>${siteName} helps customers discover thoughtfully crafted products and collections. Edit this section to tell your story.</p>`,
          },
        },
      ],
    },
    {
      title: "Contact",
      slug: "contact",
      pageType: "contact",
      sortOrder: 2,
      sections: [
        {
          type: "hero",
          content: {
            heading: "Contact",
            subheading: "Questions, partnerships, or support — we are here to help.",
            align: "left",
          },
        },
        {
          type: "form",
          content: {
            formSlug: "contact",
            heading: "Send a message",
          },
        },
      ],
    },
    {
      title: "Products",
      slug: "products",
      pageType: "products",
      sortOrder: 3,
      sections: [
        {
          type: "hero",
          content: {
            heading: "Products",
            subheading: "Browse our catalog. Add or edit items in the page builder.",
            align: "left",
          },
        },
        {
          type: "products",
          content: {
            heading: "Featured products",
            items: [
              {
                name: "Sample product",
                description: "Replace with your real product details.",
                price: "$49",
                href: "#",
              },
              {
                name: "Another product",
                description: "Add images from the media library.",
                price: "$79",
                href: "#",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Collections",
      slug: "collections",
      pageType: "collections",
      sortOrder: 4,
      sections: [
        {
          type: "hero",
          content: {
            heading: "Collections",
            subheading: "Group products into curated collections.",
            align: "left",
          },
        },
        {
          type: "collections",
          content: {
            heading: "Shop by collection",
            items: [
              {
                name: "Essentials",
                description: "Everyday favorites.",
                href: "/products",
              },
              {
                name: "New arrivals",
                description: "Just landed.",
                href: "/products",
              },
            ],
          },
        },
      ],
    },
    {
      title: "Blog",
      slug: "blog",
      pageType: "blog",
      sortOrder: 5,
      sections: [
        {
          type: "hero",
          content: {
            heading: "Blog",
            subheading: "News, guides, and updates.",
            align: "left",
          },
        },
        {
          type: "blogList",
          content: {
            heading: "Latest posts",
            limit: 12,
          },
        },
      ],
    },
  ];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => boolean,
): string {
  const root = slugify(base) || "site";
  if (!exists(root)) return root;
  let i = 2;
  while (exists(`${root}-${i}`)) {
    i += 1;
  }
  return `${root}-${i}`;
}
