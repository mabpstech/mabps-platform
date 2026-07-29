import type { PageType, SectionType } from "@/lib/website/types";

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

export const SITE_TEMPLATE_IDS = ["classic", "showcase", "catalog"] as const;
export type SiteTemplateId = (typeof SITE_TEMPLATE_IDS)[number];

export const SITE_CATEGORY_IDS = [
  "retail",
  "services",
  "restaurant",
  "professional",
  "creator",
  "other",
] as const;
export type SiteCategoryId = (typeof SITE_CATEGORY_IDS)[number];

export function isSiteTemplateId(value: unknown): value is SiteTemplateId {
  return (
    typeof value === "string" &&
    (SITE_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function isSiteCategoryId(value: unknown): value is SiteCategoryId {
  return (
    typeof value === "string" &&
    (SITE_CATEGORY_IDS as readonly string[]).includes(value)
  );
}

type Copy = {
  homeEyebrow: string;
  homeHeading: string;
  homeSubheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  featuresHeading: string;
  featureItems: Array<{ title: string; description: string }>;
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  aboutSubheading: string;
  aboutHtml: string;
  productTitle: string;
  productSubheading: string;
  collectionTitle: string;
  collectionSubheading: string;
};

function copyFor(siteName: string, category: SiteCategoryId): Copy {
  switch (category) {
    case "retail":
      return {
        homeEyebrow: siteName,
        homeHeading: `Shop ${siteName}`,
        homeSubheading:
          "Discover curated products and collections built for everyday style.",
        primaryLabel: "Shop products",
        primaryHref: "/products",
        secondaryLabel: "Browse collections",
        secondaryHref: "/collections",
        featuresHeading: "Why shop with us",
        featureItems: [
          {
            title: "Curated quality",
            description: "Every product is chosen with care.",
          },
          {
            title: "Fast support",
            description: "Questions about an order? We’re here to help.",
          },
          {
            title: "Fresh drops",
            description: "New arrivals and collections every season.",
          },
        ],
        ctaHeading: "Find your next favorite",
        ctaBody: "Explore the catalog or get in touch for personal recommendations.",
        ctaLabel: "Shop now",
        aboutSubheading: "Our brand story and the standards behind every product.",
        aboutHtml: `<p>${siteName} is a retail brand built around thoughtfully selected products. Edit this section to share your origin story and values.</p>`,
        productTitle: "Products",
        productSubheading: "Browse the catalog and feature your bestsellers.",
        collectionTitle: "Collections",
        collectionSubheading: "Group products into curated shopping experiences.",
      };
    case "restaurant":
      return {
        homeEyebrow: "Table ready",
        homeHeading: `Welcome to ${siteName}`,
        homeSubheading:
          "Seasonal menus, warm hospitality, and a space worth gathering in.",
        primaryLabel: "View menu",
        primaryHref: "/products",
        secondaryLabel: "Reserve / contact",
        secondaryHref: "/contact",
        featuresHeading: `The ${siteName} experience`,
        featureItems: [
          {
            title: "Seasonal cooking",
            description: "Menus that change with the best local ingredients.",
          },
          {
            title: "Warm service",
            description: "Hospitality that makes every visit feel personal.",
          },
          {
            title: "Memorable evenings",
            description: "Designed for dates, celebrations, and everyday meals.",
          },
        ],
        ctaHeading: "Book a table",
        ctaBody: "Tell us your preferred date and party size — we’ll take care of the rest.",
        ctaLabel: "Contact us",
        aboutSubheading: "The kitchen, the craft, and the people behind the plates.",
        aboutHtml: `<p>${siteName} is a hospitality destination. Edit this page with your chef story, hours, and what makes the dining room special.</p>`,
        productTitle: "Menu",
        productSubheading: "Highlight signature dishes, drinks, and seasonal specials.",
        collectionTitle: "Dining experiences",
        collectionSubheading: "Brunch, tasting menus, private events, and more.",
      };
    case "services":
      return {
        homeEyebrow: "Services",
        homeHeading: `${siteName} — expertise that delivers`,
        homeSubheading:
          "Clear process, sharp execution, and outcomes your clients can measure.",
        primaryLabel: "Get a proposal",
        primaryHref: "/contact",
        secondaryLabel: "About us",
        secondaryHref: "/about",
        featuresHeading: "How we work",
        featureItems: [
          {
            title: "Discovery first",
            description: "We learn the goal before recommending a path.",
          },
          {
            title: "Practical delivery",
            description: "Plans that turn into shipped work, not slide decks.",
          },
          {
            title: "Ongoing partnership",
            description: "Support after launch so momentum doesn’t stall.",
          },
        ],
        ctaHeading: "Let’s talk about your next project",
        ctaBody: "Share a short brief and we’ll respond with next steps.",
        ctaLabel: "Contact",
        aboutSubheading: "Capabilities, principles, and the team behind the work.",
        aboutHtml: `<p>${siteName} helps businesses grow with focused service engagements. Customize this page with your positioning and proof.</p>`,
        productTitle: "Offerings",
        productSubheading: "Package your services into clear, bookable offerings.",
        collectionTitle: "Solutions",
        collectionSubheading: "Group offerings by audience or outcome.",
      };
    case "professional":
      return {
        homeEyebrow: "Trusted counsel",
        homeHeading: `${siteName}`,
        homeSubheading:
          "Professional guidance with clarity, discretion, and dependable follow-through.",
        primaryLabel: "Book a consultation",
        primaryHref: "/contact",
        secondaryLabel: "Our practice",
        secondaryHref: "/about",
        featuresHeading: "What clients value",
        featureItems: [
          {
            title: "Clear advice",
            description: "Plain-language recommendations you can act on.",
          },
          {
            title: "Responsive care",
            description: "Timely updates when decisions matter most.",
          },
          {
            title: "Proven process",
            description: "Structured engagements from intake to resolution.",
          },
        ],
        ctaHeading: "Schedule a consultation",
        ctaBody: "Tell us briefly what you need and the best way to reach you.",
        ctaLabel: "Contact",
        aboutSubheading: "Credentials, approach, and the people clients rely on.",
        aboutHtml: `<p>${siteName} provides professional services with a focus on trust and clarity. Replace this copy with your practice overview.</p>`,
        productTitle: "Services",
        productSubheading: "Outline the engagements you offer.",
        collectionTitle: "Practice areas",
        collectionSubheading: "Organize services by specialty or client type.",
      };
    case "creator":
      return {
        homeEyebrow: "Portfolio",
        homeHeading: `${siteName}`,
        homeSubheading:
          "Selected work, collaborations, and the story behind the craft.",
        primaryLabel: "View work",
        primaryHref: "/about",
        secondaryLabel: "Get in touch",
        secondaryHref: "/contact",
        featuresHeading: "What I bring",
        featureItems: [
          {
            title: "Distinct voice",
            description: "A recognizable style across every project.",
          },
          {
            title: "Collaborative process",
            description: "From brief to final delivery with clear milestones.",
          },
          {
            title: "Reliable craft",
            description: "Details that hold up in production and presentation.",
          },
        ],
        ctaHeading: "Available for collaborations",
        ctaBody: "Share the project vision and timeline — I’ll reply with availability.",
        ctaLabel: "Contact",
        aboutSubheading: "Bio, selected clients, and the through-line of the work.",
        aboutHtml: `<p>${siteName} is a creator portfolio. Use this page for your bio, press, and featured collaborations.</p>`,
        productTitle: "Work",
        productSubheading: "Feature signature projects and commissions.",
        collectionTitle: "Series",
        collectionSubheading: "Group projects into themed collections.",
      };
    default:
      return {
        homeEyebrow: siteName,
        homeHeading: `Welcome to ${siteName}`,
        homeSubheading:
          "Build your presence with pages, content, and a contact path that converts.",
        primaryLabel: "Get started",
        primaryHref: "/contact",
        secondaryLabel: "Learn more",
        secondaryHref: "/about",
        featuresHeading: "Why choose us",
        featureItems: [
          {
            title: "Clear message",
            description: "Visitors understand what you offer immediately.",
          },
          {
            title: "Easy updates",
            description: "Edit pages anytime without waiting on a developer.",
          },
          {
            title: "Ready to grow",
            description: "Add products, blog posts, and forms as you scale.",
          },
        ],
        ctaHeading: "Ready to get started?",
        ctaBody: "Tell us what you need — we typically respond within one business day.",
        ctaLabel: "Contact",
        aboutSubheading: "Our story, values, and the people behind the brand.",
        aboutHtml: `<p>${siteName} helps customers discover thoughtfully crafted products and collections. Edit this section to tell your story.</p>`,
        productTitle: "Products",
        productSubheading: "Browse our catalog. Add or edit items in the page builder.",
        collectionTitle: "Collections",
        collectionSubheading: "Group products into curated collections.",
      };
  }
}

function homeHero(copy: Copy, extras: Record<string, unknown> = {}) {
  return {
    type: "hero" as const,
    content: {
      eyebrow: copy.homeEyebrow,
      heading: copy.homeHeading,
      subheading: copy.homeSubheading,
      primaryLabel: copy.primaryLabel,
      primaryHref: copy.primaryHref,
      secondaryLabel: copy.secondaryLabel,
      secondaryHref: copy.secondaryHref,
      align: "center",
      height: "lg",
      overlay: 45,
      animation: "rise",
      ...extras,
    },
  };
}

function aboutPage(siteName: string, copy: Copy, sortOrder: number): DefaultPageSeed {
  return {
    title: "About",
    slug: "about",
    pageType: "about",
    sortOrder,
    sections: [
      {
        type: "hero",
        content: {
          heading: `About ${siteName}`,
          subheading: copy.aboutSubheading,
          align: "left",
        },
      },
      {
        type: "richText",
        content: { html: copy.aboutHtml },
      },
    ],
  };
}

function contactPage(sortOrder: number): DefaultPageSeed {
  return {
    title: "Contact",
    slug: "contact",
    pageType: "contact",
    sortOrder,
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
  };
}

function productsPage(copy: Copy, sortOrder: number): DefaultPageSeed {
  return {
    title: copy.productTitle,
    slug: "products",
    pageType: "products",
    sortOrder,
    sections: [
      {
        type: "hero",
        content: {
          heading: copy.productTitle,
          subheading: copy.productSubheading,
          align: "left",
        },
      },
      {
        type: "products",
        content: {
          heading: `Featured ${copy.productTitle.toLowerCase()}`,
          items: [
            {
              name: "Sample item",
              description: "Replace with your real details.",
              price: "$49",
              href: "#",
            },
            {
              name: "Another item",
              description: "Add images from the media library.",
              price: "$79",
              href: "#",
            },
          ],
        },
      },
    ],
  };
}

function collectionsPage(copy: Copy, sortOrder: number): DefaultPageSeed {
  return {
    title: copy.collectionTitle,
    slug: "collections",
    pageType: "collections",
    sortOrder,
    sections: [
      {
        type: "hero",
        content: {
          heading: copy.collectionTitle,
          subheading: copy.collectionSubheading,
          align: "left",
        },
      },
      {
        type: "collections",
        content: {
          heading: "Explore",
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
  };
}

function blogPage(sortOrder: number): DefaultPageSeed {
  return {
    title: "Blog",
    slug: "blog",
    pageType: "blog",
    sortOrder,
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
  };
}

function includesCatalog(category: SiteCategoryId): boolean {
  return (
    category === "retail" ||
    category === "restaurant" ||
    category === "other" ||
    category === "creator"
  );
}

export function buildTemplatePages(options: {
  siteName: string;
  template?: SiteTemplateId | null;
  category?: SiteCategoryId | null;
}): DefaultPageSeed[] {
  const template = options.template ?? "classic";
  const category = options.category ?? "other";
  const copy = copyFor(options.siteName, category);
  const catalog = includesCatalog(category);

  if (template === "showcase") {
    const pages: DefaultPageSeed[] = [
      {
        title: "Home",
        slug: "home",
        pageType: "home",
        sortOrder: 0,
        sections: [
          homeHero(copy, { height: "xl", animation: "rise", overlay: 45 }),
          {
            type: "richText",
            content: {
              html: `<p>${copy.aboutHtml.replace(/<\/?p>/g, "")}</p><p>Use this showcase homepage to lead with story, then point visitors to the next step.</p>`,
            },
          },
          {
            type: "gallery",
            content: {
              heading: "Selected moments",
              mediaIds: [],
            },
          },
          {
            type: "cta",
            content: {
              heading: copy.ctaHeading,
              body: copy.ctaBody,
              buttonLabel: copy.ctaLabel,
              buttonHref: copy.primaryHref,
            },
          },
        ],
      },
      aboutPage(options.siteName, copy, 1),
      contactPage(2),
      blogPage(3),
    ];
    if (catalog) {
      pages.push(productsPage(copy, 4), collectionsPage(copy, 5));
    }
    return pages;
  }

  if (template === "catalog") {
    return [
      {
        title: "Home",
        slug: "home",
        pageType: "home",
        sortOrder: 0,
        sections: [
          homeHero(copy),
          {
            type: "products",
            content: {
              heading: copy.productTitle,
              items: [
                {
                  name: "Featured item",
                  description: "Lead with your best offer.",
                  price: "$49",
                  href: "/products",
                },
                {
                  name: "Popular pick",
                  description: "Add media and pricing in the editor.",
                  price: "$79",
                  href: "/products",
                },
                {
                  name: "New arrival",
                  description: "Keep this grid fresh as inventory changes.",
                  price: "$39",
                  href: "/products",
                },
              ],
            },
          },
          {
            type: "collections",
            content: {
              heading: copy.collectionTitle,
              items: [
                {
                  name: "Bestsellers",
                  description: "What customers love most.",
                  href: "/products",
                },
                {
                  name: "Seasonal",
                  description: "Limited-time highlights.",
                  href: "/products",
                },
              ],
            },
          },
          {
            type: "cta",
            content: {
              heading: copy.ctaHeading,
              body: copy.ctaBody,
              buttonLabel: copy.ctaLabel,
              buttonHref: copy.primaryHref,
            },
          },
        ],
      },
      productsPage(copy, 1),
      collectionsPage(copy, 2),
      aboutPage(options.siteName, copy, 3),
      contactPage(4),
      blogPage(5),
    ];
  }

  // classic
  const pages: DefaultPageSeed[] = [
    {
      title: "Home",
      slug: "home",
      pageType: "home",
      sortOrder: 0,
      sections: [
        homeHero(copy),
        {
          type: "features",
          content: {
            heading: copy.featuresHeading,
            items: copy.featureItems,
          },
        },
        {
          type: "cta",
          content: {
            heading: copy.ctaHeading,
            body: copy.ctaBody,
            buttonLabel: copy.ctaLabel,
            buttonHref: "/contact",
          },
        },
      ],
    },
    aboutPage(options.siteName, copy, 1),
    contactPage(2),
  ];

  if (catalog || category === "services" || category === "professional") {
    pages.push(productsPage(copy, pages.length), collectionsPage(copy, pages.length + 1));
  }
  pages.push(blogPage(pages.length));
  return pages;
}
