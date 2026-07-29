/**
 * Example Hero generator output for the jewellery / Kerala weddings plan.
 * Illustrative only — not used at runtime.
 */

import type { HeroSectionContent } from "@/lib/website/ai/generators/hero/types";
import type { GenerationTask } from "@/lib/website/ai/orchestrator/types";

export const EXAMPLE_HERO_TASK: GenerationTask = {
  page: "home",
  section: "Hero",
  generator: "hero-generator",
};

export const EXAMPLE_HERO_SECTION: HeroSectionContent = {
  headline: "Bridal gold crafted for Kerala wedding moments",
  subheadline:
    "Explore handcrafted bridal sets and custom designs made for families who want heirloom quality and personal showroom guidance.",
  primaryCTA: "Book a private viewing",
  secondaryCTA: "View bridal sets",
  imagePrompt:
    "Luxury Kerala jewellery showroom with elegant bridal gold collection, cinematic lighting, refined interiors, shallow depth of field",
  layout: "split-left",
  style: "luxury",
};
