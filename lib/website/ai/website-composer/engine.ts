/**
 * Deterministic Website Composer engine (Sprint C6).
 * AiWebsitePlan (+ BI/DNA/Strategy) → AiWebsiteBlueprint.
 * No LLM, network, DB, API, or marketing copy generation.
 */

import {
  AI_WEBSITE_BLUEPRINT_VERSION,
  type AiBrandStrategy,
  type AiBusinessDNA,
  type AiBusinessProfile,
  type AiContentDensity,
  type AiCtaFlow,
  type AiGeneratedFooter,
  type AiGeneratedHeader,
  type AiGeneratedNavItem,
  type AiGeneratedPage,
  type AiGeneratedSection,
  type AiGeneratedSeo,
  type AiGeneratedTheme,
  type AiGenerationIntent,
  type AiPlanSectionRole,
  type AiTrustBuildingFlow,
  type AiWebsiteBlueprint,
  type AiWebsitePlan,
} from "@/lib/website/ai/types";
import {
  aiSafeSlug,
  createEmptyIntent,
} from "@/lib/website/ai/helpers";
import { profileToGenerationIntentFields } from "@/lib/website/ai/intelligence/engine";
import {
  COLOUR_DIRECTION_TO_PRESET,
  COLOUR_PSYCHOLOGY_TO_PRESET,
  CTA_FLOW_MID_SECTION,
  DENSITY_HOME_ROLE_CAP,
  DENSITY_TO_PADDING,
  DENSITY_TO_SPACER,
  HERO_STRATEGY_TO_LAYOUT,
  PAGE_TYPE_META,
  PURPOSE_TO_TEMPLATE,
  ROLE_TO_SECTION_TYPE,
  TRUST_FLOW_INSERT,
  VISUAL_IDENTITY_TO_PRESET,
  VISUAL_PLACEHOLDER_ROLES,
  pageHref,
  type HeroLayoutVariant,
} from "@/lib/website/ai/website-composer/lexicon";
import type { AiWebsiteComposerInput } from "@/lib/website/ai/website-composer/types";
import type { PageType, SectionSettings, SectionType } from "@/lib/website/types";

function section(
  type: SectionType,
  content: Record<string, unknown> = {},
  settings?: SectionSettings,
): AiGeneratedSection {
  return settings ? { type, content, settings } : { type, content };
}

function paddingFor(density: AiContentDensity): SectionSettings {
  return { paddingY: DENSITY_TO_PADDING[density] };
}

function resolveCtaHref(
  plan: AiWebsitePlan,
  pages: PageType[],
): string {
  const ctaPage = plan.navigationStructure.value.ctaPage;
  if (pages.includes(ctaPage)) {
    return pageHref(ctaPage, PAGE_TYPE_META[ctaPage].slug);
  }
  if (pages.includes("contact")) return "/contact";
  if (pages.includes("products")) return "/products";
  return "/";
}

function resolveSecondaryHref(
  plan: AiWebsitePlan,
  pages: PageType[],
): string {
  const flow = plan.conversionFlow.value;
  if (
    (flow === "home_to_catalog_to_purchase" ||
      plan.ctaFlow.value === "shop_path") &&
    pages.includes("products")
  ) {
    return "/products";
  }
  if (
    (flow === "home_to_about_to_contact" ||
      plan.userJourney.value === "land_learn_trust_contact") &&
    pages.includes("about")
  ) {
    return "/about";
  }
  if (pages.includes("about")) return "/about";
  if (pages.includes("products")) return "/products";
  return resolveCtaHref(plan, pages);
}

function heroLayout(
  dna: AiBusinessDNA,
  density: AiContentDensity,
): HeroLayoutVariant {
  const base = HERO_STRATEGY_TO_LAYOUT[dna.heroStrategy.value];
  if (density === "sparse" && base.height === "xl") {
    return { ...base, height: "lg" };
  }
  if (density === "dense" && base.height === "sm") {
    return { ...base, height: "md" };
  }
  return { ...base };
}

/**
 * Structural hero shell — layout / CTA hrefs only. Text fields stay empty.
 * Home Hero *copy* is authored solely by the Hero Generator (Phase 3) and
 * injected in Phase 4. This shell is the legacy fallback structure only.
 */
function buildHeroShell(input: {
  layout: HeroLayoutVariant;
  primaryHref: string;
  secondaryHref: string;
  includeSecondary: boolean;
  density: AiContentDensity;
  withImagePlaceholder: boolean;
}): AiGeneratedSection {
  const content: Record<string, unknown> = {
    eyebrow: "",
    heading: "",
    subheading: "",
    primaryLabel: "",
    primaryHref: input.primaryHref,
    secondaryLabel: "",
    secondaryHref: input.includeSecondary ? input.secondaryHref : "",
    align: input.layout.align,
    height: input.layout.height,
    overlay: input.layout.overlay,
    animation: input.layout.animation,
    backgroundMediaId: input.withImagePlaceholder ? null : null,
    mobileMediaId: null,
    desktopMediaId: null,
    backgroundVideoUrl: "",
  };
  return section("hero", content, paddingFor(input.density));
}

function buildFeaturesShell(
  density: AiContentDensity,
  slotCount: number,
): AiGeneratedSection {
  const items = Array.from({ length: slotCount }, () => ({
    title: "",
    description: "",
  }));
  return section(
    "features",
    { heading: "", items },
    paddingFor(density),
  );
}

function buildCtaShell(
  density: AiContentDensity,
  buttonHref: string,
): AiGeneratedSection {
  return section(
    "cta",
    {
      heading: "",
      body: "",
      buttonLabel: "",
      buttonHref,
    },
    paddingFor(density),
  );
}

function buildFormShell(density: AiContentDensity): AiGeneratedSection {
  return section(
    "form",
    { formSlug: "contact", heading: "" },
    paddingFor(density),
  );
}

function buildRichTextShell(density: AiContentDensity): AiGeneratedSection {
  return section("richText", { html: "" }, paddingFor(density));
}

function buildProductsShell(density: AiContentDensity): AiGeneratedSection {
  return section("products", { heading: "", items: [] }, paddingFor(density));
}

function buildCollectionsShell(density: AiContentDensity): AiGeneratedSection {
  return section(
    "collections",
    { heading: "", items: [] },
    paddingFor(density),
  );
}

function buildGalleryPlaceholder(density: AiContentDensity): AiGeneratedSection {
  return section(
    "gallery",
    { heading: "", mediaIds: [] },
    paddingFor(density),
  );
}

function buildImagePlaceholder(density: AiContentDensity): AiGeneratedSection {
  return section(
    "image",
    { mediaId: null, alt: "", caption: "" },
    paddingFor(density),
  );
}

function buildBlogListShell(density: AiContentDensity): AiGeneratedSection {
  const limit = density === "sparse" ? 3 : density === "dense" ? 12 : 6;
  return section(
    "blogList",
    { heading: "", limit },
    paddingFor(density),
  );
}

function buildSpacer(density: AiContentDensity): AiGeneratedSection | null {
  const height = DENSITY_TO_SPACER[density];
  if (!height) return null;
  return section("spacer", { height });
}

function featureSlotCount(density: AiContentDensity): number {
  switch (density) {
    case "sparse":
      return 2;
    case "balanced":
      return 3;
    case "rich":
      return 4;
    case "dense":
      return 6;
  }
}

function wantsVisualPlaceholder(
  plan: AiWebsitePlan,
  dna: AiBusinessDNA,
  role: AiPlanSectionRole,
): boolean {
  if (!VISUAL_PLACEHOLDER_ROLES.includes(role)) return false;
  if (plan.contentPriorities.value.includes("visual_showcase")) return true;
  if (
    dna.imageDirection.value === "product" ||
    dna.imageDirection.value === "food" ||
    dna.imageDirection.value === "lifestyle" ||
    dna.imageDirection.value === "place" ||
    dna.imageDirection.value === "architecture"
  ) {
    return true;
  }
  return (
    dna.visualIdentity.value === "editorial_magazine" ||
    dna.visualIdentity.value === "warm_organic"
  );
}

/**
 * Reorder / inject trust + conversion roles per plan flows.
 */
function arrangeHomeRoles(
  roles: AiPlanSectionRole[],
  trustFlow: AiTrustBuildingFlow,
  ctaFlow: AiCtaFlow,
  pages: PageType[],
): AiPlanSectionRole[] {
  let next = [...roles];

  // Ensure hero first.
  next = next.filter((role) => role !== "hero");
  next.unshift("hero");

  // Catalog only when product pages exist.
  if (!pages.includes("products") && !pages.includes("collections")) {
    next = next.filter((role) => role !== "catalog");
  }

  // Contact role when contact page or form path exists.
  if (!pages.includes("contact")) {
    next = next.filter((role) => role !== "contact");
  }

  // Trust role placement.
  const trustPos = TRUST_FLOW_INSERT[trustFlow];
  const hasTrust = next.includes("trust");
  if (!hasTrust && (trustPos === "after_hero" || trustPos === "before_cta")) {
    next.splice(1, 0, "trust");
  } else if (hasTrust) {
    next = next.filter((role) => role !== "trust");
    if (trustPos === "after_hero") {
      next.splice(1, 0, "trust");
    } else if (trustPos === "after_value") {
      const valueIdx = next.findIndex(
        (role) => role === "value_proposition" || role === "offer",
      );
      next.splice(valueIdx >= 0 ? valueIdx + 1 : 2, 0, "trust");
    } else if (trustPos === "before_cta") {
      const ctaIdx = next.indexOf("cta");
      next.splice(ctaIdx >= 0 ? ctaIdx : next.length, 0, "trust");
    } else if (trustPos === "before_contact") {
      const contactIdx = next.indexOf("contact");
      next.splice(contactIdx >= 0 ? contactIdx : next.length, 0, "trust");
    } else {
      const mid = Math.min(Math.floor(next.length / 2) + 1, next.length);
      next.splice(mid, 0, "trust");
    }
  }

  // Mid CTA from flow — ensure cta role exists when required.
  if (CTA_FLOW_MID_SECTION[ctaFlow] && !next.includes("cta")) {
    const contactIdx = next.indexOf("contact");
    next.splice(contactIdx >= 0 ? contactIdx : next.length, 0, "cta");
  }

  // Conversion: catalog early for shop paths.
  if (
    (ctaFlow === "shop_path" || next.includes("catalog")) &&
    next.includes("catalog")
  ) {
    next = next.filter((role) => role !== "catalog");
    next.splice(1, 0, "catalog");
  }

  // Deduplicate while preserving order.
  const seen = new Set<AiPlanSectionRole>();
  const unique: AiPlanSectionRole[] = [];
  for (const role of next) {
    if (seen.has(role)) continue;
    seen.add(role);
    unique.push(role);
  }
  return unique;
}

function capRoles(
  roles: AiPlanSectionRole[],
  density: AiContentDensity,
): AiPlanSectionRole[] {
  const cap = DENSITY_HOME_ROLE_CAP[density];
  if (roles.length <= cap) return roles;
  const essential: AiPlanSectionRole[] = ["hero", "cta", "contact"];
  const kept: AiPlanSectionRole[] = [];
  for (const role of roles) {
    if (kept.length >= cap && !essential.includes(role)) continue;
    if (kept.length >= cap && essential.includes(role) && !kept.includes(role)) {
      // Drop a non-essential to make room.
      const dropIdx = [...kept]
        .reverse()
        .findIndex((r) => !essential.includes(r));
      if (dropIdx >= 0) {
        kept.splice(kept.length - 1 - dropIdx, 1);
      } else if (kept.length >= cap) {
        continue;
      }
    }
    if (!kept.includes(role)) kept.push(role);
  }
  return kept.slice(0, Math.max(cap, kept.filter((r) => essential.includes(r)).length));
}

function composeRoleSection(
  role: AiPlanSectionRole,
  ctx: {
    density: AiContentDensity;
    plan: AiWebsitePlan;
    dna: AiBusinessDNA;
    pages: PageType[];
    primaryHref: string;
    secondaryHref: string;
    includeSecondary: boolean;
  },
): AiGeneratedSection[] {
  const density = ctx.density;
  const slots = featureSlotCount(density);
  const visual = wantsVisualPlaceholder(ctx.plan, ctx.dna, role);

  switch (role) {
    case "hero":
      return [
        buildHeroShell({
          layout: heroLayout(ctx.dna, density),
          primaryHref: ctx.primaryHref,
          secondaryHref: ctx.secondaryHref,
          includeSecondary: ctx.includeSecondary,
          density,
          withImagePlaceholder: true,
        }),
      ];
    case "value_proposition":
    case "offer":
    case "proof":
    case "trust": {
      const out: AiGeneratedSection[] = [buildFeaturesShell(density, slots)];
      if (visual && role !== "value_proposition") {
        out.push(buildGalleryPlaceholder(density));
      }
      return out;
    }
    case "story": {
      const out: AiGeneratedSection[] = [buildRichTextShell(density)];
      if (visual) out.push(buildImagePlaceholder(density));
      return out;
    }
    case "catalog": {
      const out: AiGeneratedSection[] = [];
      if (ctx.pages.includes("products")) out.push(buildProductsShell(density));
      if (ctx.pages.includes("collections")) {
        out.push(buildCollectionsShell(density));
      }
      if (out.length === 0) out.push(buildProductsShell(density));
      if (visual) out.push(buildGalleryPlaceholder(density));
      return out;
    }
    case "faq":
      return [buildRichTextShell(density)];
    case "contact":
      return [buildFormShell(density)];
    case "cta":
      return [buildCtaShell(density, ctx.primaryHref)];
    default: {
      const type = ROLE_TO_SECTION_TYPE[role];
      return [section(type, {}, paddingFor(density))];
    }
  }
}

function applyVisualRhythm(
  sections: AiGeneratedSection[],
  density: AiContentDensity,
): AiGeneratedSection[] {
  const spacer = buildSpacer(density);
  if (!spacer || sections.length < 2) return sections;

  const out: AiGeneratedSection[] = [];
  for (let i = 0; i < sections.length; i += 1) {
    out.push(sections[i]);
    const current = sections[i];
    const next = sections[i + 1];
    if (!next) break;
    // Rhythm between major blocks — skip if either side is already a spacer.
    if (current.type === "spacer" || next.type === "spacer") continue;
    if (
      current.type === "hero" ||
      next.type === "cta" ||
      next.type === "form" ||
      density === "sparse"
    ) {
      out.push(spacer);
    }
  }
  return out;
}

function composeHomePage(
  input: AiWebsiteComposerInput,
  pages: PageType[],
): AiGeneratedPage {
  const { plan, dna } = input;
  const density = dna.contentDensity.value;
  const primaryHref = resolveCtaHref(plan, pages);
  const secondaryHref = resolveSecondaryHref(plan, pages);
  const includeSecondary =
    dna.ctaStrategy.value === "dual_primary_secondary" ||
    dna.ctaStrategy.value === "soft_secondary" ||
    dna.ctaStrategy.value === "multi_path" ||
    plan.ctaFlow.value === "soft_then_hard" ||
    plan.ctaFlow.value === "multi_path_by_intent";

  let roles = arrangeHomeRoles(
    plan.sectionPriority.value,
    plan.trustBuildingFlow.value,
    plan.ctaFlow.value,
    pages,
  );
  roles = capRoles(roles, density);

  const composed: AiGeneratedSection[] = [];
  for (const role of roles) {
    composed.push(
      ...composeRoleSection(role, {
        density,
        plan,
        dna,
        pages,
        primaryHref,
        secondaryHref,
        includeSecondary,
      }),
    );
  }

  const sections = applyVisualRhythm(composed, density);
  const meta = PAGE_TYPE_META.home;

  return {
    title: meta.title,
    slug: meta.slug,
    pageType: "home",
    seoTitle: null,
    seoDescription: null,
    sections,
  };
}

function composeInnerPage(
  pageType: PageType,
  density: AiContentDensity,
  primaryHref: string,
  plan: AiWebsitePlan,
): AiGeneratedPage {
  const meta = PAGE_TYPE_META[pageType];
  const layout = paddingFor(density);
  const sections: AiGeneratedSection[] = [];

  sections.push(
    section(
      "hero",
      {
        eyebrow: "",
        heading: "",
        subheading: "",
        primaryLabel: "",
        primaryHref,
        secondaryLabel: "",
        secondaryHref: "",
        align: "left",
        height: "sm",
        overlay: 25,
        animation: "fade",
        backgroundMediaId: null,
        mobileMediaId: null,
        desktopMediaId: null,
        backgroundVideoUrl: "",
      },
      layout,
    ),
  );

  switch (pageType) {
    case "about":
      sections.push(buildRichTextShell(density));
      if (plan.trustBuildingFlow.value !== "guarantees_near_cta") {
        sections.push(buildFeaturesShell(density, featureSlotCount(density)));
      }
      if (plan.contentPriorities.value.includes("visual_showcase")) {
        sections.push(buildGalleryPlaceholder(density));
      }
      sections.push(buildCtaShell(density, primaryHref));
      break;
    case "contact":
      sections.push(buildFormShell(density));
      break;
    case "products":
      sections.push(buildProductsShell(density));
      if (density === "rich" || density === "dense") {
        sections.push(buildCtaShell(density, primaryHref));
      }
      break;
    case "collections":
      sections.push(buildCollectionsShell(density));
      break;
    case "blog":
      sections.push(buildBlogListShell(density));
      break;
    case "custom":
      sections.push(buildRichTextShell(density));
      break;
    default:
      sections.push(buildRichTextShell(density));
  }

  return {
    title: meta.title,
    slug: meta.slug,
    pageType,
    seoTitle: null,
    seoDescription: null,
    sections,
  };
}

function buildIntent(input: AiWebsiteComposerInput): AiGenerationIntent {
  const prompt = input.prompt ?? "";
  const fields = profileToGenerationIntentFields(input.profile, prompt);
  const template =
    input.options?.template ??
    PURPOSE_TO_TEMPLATE[input.plan.websitePurpose.value];
  const category = input.options?.category ?? fields.category;
  const tone = input.options?.tone ?? fields.tone;
  const requestedPageTypes =
    input.options?.includePageTypes &&
    input.options.includePageTypes.length > 0
      ? input.options.includePageTypes
      : input.plan.pageOrder.value.length > 0
        ? input.plan.pageOrder.value
        : fields.requestedPageTypes;

  return {
    ...createEmptyIntent(prompt),
    prompt,
    locale: input.options?.locale?.trim() || fields.locale,
    category,
    template,
    tone,
    businessName: fields.businessName,
    industry: fields.industry,
    requestedPageTypes,
  };
}

function buildTheme(
  profile: AiBusinessProfile,
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
  options?: AiWebsiteComposerInput["options"],
): AiGeneratedTheme {
  if (options?.themePresetId) {
    return {
      presetId: options.themePresetId,
      tokens: {
        brand: {
          businessName: profile.name,
          slogan: profile.slogan,
          logoMediaId: null,
          faviconMediaId: null,
          brandImageMediaId: null,
        },
      },
    };
  }

  let presetId: string | null =
    COLOUR_PSYCHOLOGY_TO_PRESET[strategy.colourPsychology.value] ?? null;

  if (profile.colourDirection) {
    presetId =
      COLOUR_DIRECTION_TO_PRESET[profile.colourDirection] ?? presetId;
  }

  const fromIdentity = VISUAL_IDENTITY_TO_PRESET[dna.visualIdentity.value];
  if (
    dna.visualIdentity.confidence >= 0.55 &&
    fromIdentity &&
    !profile.colourDirection
  ) {
    presetId = fromIdentity;
  }

  if (profile.category === "professional") {
    presetId = "medical-clean";
  } else if (profile.category === "restaurant") {
    presetId = "restaurant-earth";
  } else if (profile.businessType === "saas") {
    presetId = "technology-dark";
  }

  return {
    presetId,
    tokens: {
      brand: {
        businessName: profile.name,
        slogan: profile.slogan,
        logoMediaId: null,
        faviconMediaId: null,
        brandImageMediaId: null,
      },
    },
  };
}

function buildHeader(
  profile: AiBusinessProfile,
  plan: AiWebsitePlan,
  pages: PageType[],
): AiGeneratedHeader {
  const ctaHref = resolveCtaHref(plan, pages);
  return {
    logoText: profile.name,
    showLogo: true,
    sticky: true,
    ctaLabel: null,
    ctaHref,
    ctaStyle: "primary",
    announcementText: null,
    announcementEnabled: false,
  };
}

function buildFooter(
  profile: AiBusinessProfile,
  plan: AiWebsitePlan,
  pages: AiGeneratedPage[],
): AiGeneratedFooter {
  const year = new Date().getUTCFullYear();
  const strategy = plan.footerStrategy.value;

  const navLinks = pages
    .filter((page) => page.pageType !== "custom")
    .map((page) => ({
      label: page.title,
      href: pageHref(page.pageType, page.slug),
    }));

  const columns =
    strategy === "minimal_legal"
      ? []
      : strategy === "contact_heavy" || strategy === "trust_and_contact"
        ? [
            {
              title: "Pages",
              links: navLinks,
            },
            {
              title: PAGE_TYPE_META.contact.title,
              links: [
                {
                  label: PAGE_TYPE_META.contact.title,
                  href: pages.some((p) => p.pageType === "contact")
                    ? "/contact"
                    : resolveCtaHref(
                        plan,
                        pages.map((p) => p.pageType),
                      ),
                },
              ],
            },
          ]
        : [
            {
              title: "Pages",
              links: navLinks,
            },
          ];

  return {
    copyrightText: `© ${year} ${profile.name}`,
    showSocial:
      strategy === "brand_story_brief" ||
      strategy === "multi_column_utility",
    socialLinks: [],
    columns,
  };
}

function buildSeo(profile: AiBusinessProfile): AiGeneratedSeo {
  return {
    defaultTitle: profile.name,
    defaultDescription: null,
    robots: "index,follow",
    twitterHandle: null,
  };
}

function buildNavigation(
  plan: AiWebsitePlan,
  pages: AiGeneratedPage[],
): AiGeneratedNavItem[] {
  const structure = plan.navigationStructure.value;
  const byType = new Map(pages.map((page) => [page.pageType, page]));

  const orderedTypes: PageType[] = [];
  for (const pageType of structure.primaryPages) {
    if (byType.has(pageType) && !orderedTypes.includes(pageType)) {
      orderedTypes.push(pageType);
    }
  }
  for (const pageType of structure.secondaryPages) {
    if (byType.has(pageType) && !orderedTypes.includes(pageType)) {
      orderedTypes.push(pageType);
    }
  }
  for (const page of pages) {
    if (!orderedTypes.includes(page.pageType)) {
      orderedTypes.push(page.pageType);
    }
  }

  // Home usually omitted from visible nav or kept first — include all non-home first.
  const items: AiGeneratedNavItem[] = [];
  for (const pageType of orderedTypes) {
    if (pageType === "home") continue;
    const page = byType.get(pageType);
    if (!page) continue;
    items.push({
      label: page.title,
      pageSlug: page.slug,
      pageType: page.pageType,
      href: null,
      openInNewTab: false,
    });
  }
  return items;
}

/**
 * Compose a validating AiWebsiteBlueprint from plan + upstream signals.
 * Pure / synchronous / deterministic. No marketing copy.
 */
export function composeWebsiteBlueprint(
  input: AiWebsiteComposerInput,
): AiWebsiteBlueprint {
  const { profile, dna, strategy, plan } = input;
  const density = dna.contentDensity.value;
  const pageTypes =
    plan.pageOrder.value.length > 0
      ? plan.pageOrder.value
      : plan.requiredPages.value;

  const uniquePages: PageType[] = [];
  for (const pageType of pageTypes) {
    if (!uniquePages.includes(pageType)) uniquePages.push(pageType);
  }
  if (!uniquePages.includes("home")) uniquePages.unshift("home");

  const primaryHref = resolveCtaHref(plan, uniquePages);
  const pages: AiGeneratedPage[] = [];

  for (const pageType of uniquePages) {
    if (pageType === "home") {
      pages.push(composeHomePage(input, uniquePages));
    } else {
      pages.push(composeInnerPage(pageType, density, primaryHref, plan));
    }
  }

  const intent = buildIntent(input);
  const siteName = profile.name || intent.businessName || "New website";

  return {
    version: AI_WEBSITE_BLUEPRINT_VERSION,
    intent,
    site: {
      name: siteName,
      slug: aiSafeSlug(siteName, "site"),
    },
    brand: profile,
    theme: buildTheme(profile, dna, strategy, input.options),
    header: buildHeader(profile, plan, uniquePages),
    footer: buildFooter(profile, plan, pages),
    seo: buildSeo(profile),
    pages,
    navigation: buildNavigation(plan, pages),
  };
}

/** Convenience wrapper matching prior layer helpers. */
export function composeWebsiteBlueprintFromInputs(
  profile: AiBusinessProfile,
  dna: AiBusinessDNA,
  strategy: AiBrandStrategy,
  plan: AiWebsitePlan,
  prompt = "",
): AiWebsiteBlueprint {
  return composeWebsiteBlueprint({
    profile,
    dna,
    strategy,
    plan,
    prompt,
  });
}
