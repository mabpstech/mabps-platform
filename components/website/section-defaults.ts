import type { SectionType } from "@/lib/website/types";

/** Client-side defaults when adding a section (mirrors repository defaults). */
export function defaultSectionContent(
  type: SectionType,
): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        eyebrow: "",
        heading: "Welcome to your website",
        subheading: "Share what makes your business special.",
        primaryLabel: "Get started",
        primaryHref: "/contact",
        secondaryLabel: "Learn more",
        secondaryHref: "/about",
        align: "center",
        height: "md",
        overlay: 40,
        animation: "fade",
        backgroundMediaId: null,
        mobileMediaId: null,
        desktopMediaId: null,
        backgroundVideoUrl: "",
      };
    case "richText":
      return { html: "<p>Write something here.</p>" };
    case "image":
      return { mediaId: null, alt: "", caption: "" };
    case "features":
      return {
        heading: "Features",
        items: [{ title: "Feature", description: "Description" }],
      };
    case "cta":
      return {
        heading: "Call to action",
        body: "Add supporting copy.",
        buttonLabel: "Learn more",
        buttonHref: "/",
      };
    case "products":
      return { heading: "Products", items: [] };
    case "collections":
      return { heading: "Collections", items: [] };
    case "form":
      return { formSlug: "contact", heading: "Contact form" };
    case "blogList":
      return { heading: "Latest posts", limit: 6 };
    case "gallery":
      return { heading: "Gallery", mediaIds: [] };
    case "spacer":
      return { height: "md" };
    default:
      return {};
  }
}
