/**
 * Maps hero-generator layout/style enums onto existing Builder hero fields.
 * No new components — only align / height / overlay / animation.
 */

import type {
  HeroLayout,
  HeroStyle,
} from "@/lib/website/ai/generators/hero/types";
import type { BuilderHeroContent } from "@/lib/website/ai/builder-adapter/types";

export type BuilderHeroLayoutFields = Pick<
  BuilderHeroContent,
  "align" | "height" | "overlay" | "animation"
>;

/** Generator layout → Builder layout controls. */
export const HERO_LAYOUT_TO_BUILDER: Record<
  HeroLayout,
  Pick<BuilderHeroLayoutFields, "align" | "height">
> = {
  "split-left": { align: "left", height: "lg" },
  "split-right": { align: "right", height: "lg" },
  center: { align: "center", height: "md" },
  fullscreen: { align: "center", height: "xl" },
};

/** Generator style → overlay / entrance motion on the existing Hero. */
export const HERO_STYLE_TO_BUILDER: Record<
  HeroStyle,
  Pick<BuilderHeroLayoutFields, "overlay" | "animation">
> = {
  luxury: { overlay: 45, animation: "fade" },
  modern: { overlay: 35, animation: "fade" },
  minimal: { overlay: 20, animation: "none" },
  spiritual: { overlay: 40, animation: "rise" },
  corporate: { overlay: 30, animation: "fade" },
  restaurant: { overlay: 40, animation: "rise" },
  healthcare: { overlay: 30, animation: "fade" },
};

export const DEFAULT_PRIMARY_HREF = "/contact";
export const DEFAULT_SECONDARY_HREF = "/about";

export function resolveHeroLayoutFields(
  layout: HeroLayout,
  style: HeroStyle,
): BuilderHeroLayoutFields {
  return {
    ...HERO_LAYOUT_TO_BUILDER[layout],
    ...HERO_STYLE_TO_BUILDER[style],
  };
}
