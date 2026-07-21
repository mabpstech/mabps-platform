import type { ThemeColorPalette, ThemeTokens } from "@/lib/website/theme/types";
import { DEFAULT_DARK_COLORS, DEFAULT_THEME_TOKENS } from "@/lib/website/theme/defaults";

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  category:
    | "classic"
    | "luxury"
    | "creative"
    | "industry"
    | "tech"
    | "nature";
  swatch: [string, string, string];
  tokens: ThemeTokens;
};

function palette(partial: Partial<ThemeColorPalette>): ThemeColorPalette {
  return { ...DEFAULT_THEME_TOKENS.colors, ...partial };
}

function darkPalette(partial: Partial<ThemeColorPalette> = {}): ThemeColorPalette {
  return { ...DEFAULT_DARK_COLORS, ...partial };
}

function buildPreset(
  id: string,
  name: string,
  description: string,
  category: ThemePreset["category"],
  colors: ThemeColorPalette,
  dark: ThemeColorPalette,
  extras: Partial<ThemeTokens> = {},
): ThemePreset {
  const tokens: ThemeTokens = {
    ...DEFAULT_THEME_TOKENS,
    ...extras,
    version: 1,
    presetId: id,
    brand: { ...DEFAULT_THEME_TOKENS.brand, ...(extras.brand ?? {}) },
    colors,
    darkMode: {
      enabled: extras.darkMode?.enabled ?? true,
      preview: false,
      colors: dark,
    },
    typography: {
      ...DEFAULT_THEME_TOKENS.typography,
      ...(extras.typography ?? {}),
    },
    buttons: { ...DEFAULT_THEME_TOKENS.buttons, ...(extras.buttons ?? {}) },
    spacing: { ...DEFAULT_THEME_TOKENS.spacing, ...(extras.spacing ?? {}) },
    borders: { ...DEFAULT_THEME_TOKENS.borders, ...(extras.borders ?? {}) },
    shadows: { ...DEFAULT_THEME_TOKENS.shadows, ...(extras.shadows ?? {}) },
    icons: { ...DEFAULT_THEME_TOKENS.icons, ...(extras.icons ?? {}) },
    animations: {
      ...DEFAULT_THEME_TOKENS.animations,
      ...(extras.animations ?? {}),
    },
    header: { ...DEFAULT_THEME_TOKENS.header, ...(extras.header ?? {}) },
    footer: { ...DEFAULT_THEME_TOKENS.footer, ...(extras.footer ?? {}) },
    forms: { ...DEFAULT_THEME_TOKENS.forms, ...(extras.forms ?? {}) },
    cards: { ...DEFAULT_THEME_TOKENS.cards, ...(extras.cards ?? {}) },
    sections: { ...DEFAULT_THEME_TOKENS.sections, ...(extras.sections ?? {}) },
  };

  return {
    id,
    name,
    description,
    category,
    swatch: [colors.primary, colors.accent, colors.background],
    tokens,
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  buildPreset(
    "luxury-black",
    "Luxury Black",
    "Deep charcoal surfaces with refined gold accents.",
    "luxury",
    palette({
      primary: "#0a0a0a",
      secondary: "#262626",
      accent: "#c9a227",
      background: "#0a0a0a",
      surface: "#171717",
      border: "#404040",
      textPrimary: "#fafafa",
      textSecondary: "#d4d4d4",
      muted: "#a3a3a3",
      hover: "#c9a227",
      active: "#e8c547",
    }),
    darkPalette({
      primary: "#fafafa",
      accent: "#e8c547",
      background: "#000000",
      surface: "#0a0a0a",
    }),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "Georgia, 'Times New Roman', serif",
        bodyFont: "ui-sans-serif, system-ui, sans-serif",
        letterSpacing: "0.02em",
      },
      borders: {
        ...DEFAULT_THEME_TOKENS.borders,
        globalRadius: "0.25rem",
        preset: "soft",
      },
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "square",
        shadow: "none",
      },
      header: { ...DEFAULT_THEME_TOKENS.header, style: "solid", shadow: false },
    },
  ),
  buildPreset(
    "minimal-white",
    "Minimal White",
    "Clean white canvas with precise typography.",
    "classic",
    palette({
      primary: "#18181b",
      secondary: "#3f3f46",
      accent: "#18181b",
      background: "#ffffff",
      surface: "#fafafa",
      border: "#e4e4e7",
    }),
    darkPalette(),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "ui-sans-serif, system-ui, sans-serif",
        bodyFont: "ui-sans-serif, system-ui, sans-serif",
      },
      cards: { ...DEFAULT_THEME_TOKENS.cards, style: "outlined", shadow: "none" },
    },
  ),
  buildPreset(
    "modern-blue",
    "Modern Blue",
    "Confident blues for contemporary brands.",
    "classic",
    palette({
      primary: "#1d4ed8",
      secondary: "#1e3a8a",
      accent: "#38bdf8",
      background: "#f8fafc",
      surface: "#ffffff",
      border: "#cbd5e1",
      textPrimary: "#0f172a",
      textSecondary: "#334155",
      muted: "#64748b",
      hover: "#1e40af",
      active: "#1e3a8a",
    }),
    darkPalette({
      primary: "#60a5fa",
      accent: "#38bdf8",
      background: "#020617",
      surface: "#0f172a",
    }),
    {
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "rounded",
        hoverAnimation: "scale",
      },
      header: { ...DEFAULT_THEME_TOKENS.header, style: "sticky", shadow: true },
    },
  ),
  buildPreset(
    "elegant-gold",
    "Elegant Gold",
    "Warm cream surfaces with elegant metallic accents.",
    "luxury",
    palette({
      primary: "#92400e",
      secondary: "#78350f",
      accent: "#d97706",
      background: "#fffbeb",
      surface: "#ffffff",
      border: "#fde68a",
      textPrimary: "#451a03",
      textSecondary: "#78350f",
      muted: "#a16207",
      hover: "#b45309",
      active: "#78350f",
    }),
    darkPalette({
      primary: "#fbbf24",
      accent: "#f59e0b",
      background: "#1c1917",
      surface: "#292524",
    }),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "Georgia, Cambria, serif",
        bodyFont: "Georgia, Cambria, serif",
      },
      borders: {
        ...DEFAULT_THEME_TOKENS.borders,
        globalRadius: "0.375rem",
        preset: "soft",
      },
    },
  ),
  buildPreset(
    "creative-purple",
    "Creative Purple",
    "Bold violet energy for agencies and creators.",
    "creative",
    palette({
      primary: "#6d28d9",
      secondary: "#4c1d95",
      accent: "#c084fc",
      background: "#faf5ff",
      surface: "#ffffff",
      border: "#e9d5ff",
      textPrimary: "#2e1065",
      textSecondary: "#5b21b6",
      muted: "#7c3aed",
      hover: "#5b21b6",
      active: "#4c1d95",
    }),
    darkPalette({
      primary: "#c084fc",
      accent: "#e9d5ff",
      background: "#1e1b4b",
      surface: "#312e81",
    }),
    {
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "pill",
        hoverAnimation: "glow",
      },
      animations: {
        ...DEFAULT_THEME_TOKENS.animations,
        entrance: "zoom",
      },
    },
  ),
  buildPreset(
    "nature-green",
    "Nature Green",
    "Organic greens for wellness and outdoors.",
    "nature",
    palette({
      primary: "#166534",
      secondary: "#14532d",
      accent: "#65a30d",
      background: "#f7fbf8",
      surface: "#ffffff",
      border: "#bbf7d0",
      textPrimary: "#052e16",
      textSecondary: "#166534",
      muted: "#4d7c0f",
      hover: "#15803d",
      active: "#14532d",
    }),
    darkPalette({
      primary: "#86efac",
      accent: "#a3e635",
      background: "#052e16",
      surface: "#14532d",
    }),
  ),
  buildPreset(
    "corporate-gray",
    "Corporate Gray",
    "Neutral professionalism for enterprise sites.",
    "classic",
    palette({
      primary: "#334155",
      secondary: "#1e293b",
      accent: "#0ea5e9",
      background: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",
      textPrimary: "#0f172a",
      textSecondary: "#334155",
      muted: "#64748b",
      hover: "#1e293b",
      active: "#020617",
    }),
    darkPalette({
      primary: "#e2e8f0",
      accent: "#38bdf8",
      background: "#0f172a",
      surface: "#1e293b",
    }),
    {
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "square",
        shadow: "none",
      },
      cards: {
        ...DEFAULT_THEME_TOKENS.cards,
        style: "outlined",
        hoverLift: false,
      },
    },
  ),
  buildPreset(
    "fashion-rose",
    "Fashion Rose",
    "Soft rose tones for lifestyle and fashion.",
    "creative",
    palette({
      primary: "#9f1239",
      secondary: "#881337",
      accent: "#fb7185",
      background: "#fff1f2",
      surface: "#ffffff",
      border: "#fecdd3",
      textPrimary: "#4c0519",
      textSecondary: "#9f1239",
      muted: "#be123c",
      hover: "#be123c",
      active: "#881337",
    }),
    darkPalette({
      primary: "#fb7185",
      accent: "#fda4af",
      background: "#4c0519",
      surface: "#881337",
    }),
    {
      borders: {
        ...DEFAULT_THEME_TOKENS.borders,
        globalRadius: "1rem",
        preset: "pill",
      },
      buttons: { ...DEFAULT_THEME_TOKENS.buttons, shape: "pill" },
    },
  ),
  buildPreset(
    "restaurant-earth",
    "Restaurant Earth",
    "Warm earthy tones for hospitality and food.",
    "industry",
    palette({
      primary: "#9a3412",
      secondary: "#7c2d12",
      accent: "#ea580c",
      background: "#fffaf7",
      surface: "#ffffff",
      border: "#fed7aa",
      textPrimary: "#431407",
      textSecondary: "#9a3412",
      muted: "#c2410c",
      hover: "#c2410c",
      active: "#7c2d12",
    }),
    darkPalette({
      primary: "#fdba74",
      accent: "#fb923c",
      background: "#1c1917",
      surface: "#292524",
    }),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "Georgia, 'Times New Roman', serif",
      },
      header: {
        ...DEFAULT_THEME_TOKENS.header,
        style: "transparent",
        announcementBar: true,
      },
    },
  ),
  buildPreset(
    "technology-dark",
    "Technology Dark",
    "Dark product surfaces with electric accents.",
    "tech",
    palette({
      primary: "#22d3ee",
      secondary: "#0891b2",
      accent: "#818cf8",
      background: "#020617",
      surface: "#0f172a",
      border: "#1e293b",
      textPrimary: "#f8fafc",
      textSecondary: "#cbd5e1",
      muted: "#94a3b8",
      hover: "#67e8f9",
      active: "#a5f3fc",
    }),
    darkPalette({
      primary: "#22d3ee",
      accent: "#a78bfa",
      background: "#000000",
      surface: "#020617",
    }),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "ui-sans-serif, system-ui, sans-serif",
        bodyFont: "ui-sans-serif, system-ui, sans-serif",
      },
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        hoverAnimation: "glow",
      },
      header: { ...DEFAULT_THEME_TOKENS.header, style: "glass", shadow: true },
      cards: {
        ...DEFAULT_THEME_TOKENS.cards,
        style: "elevated",
        hoverScale: true,
      },
    },
  ),
  buildPreset(
    "medical-clean",
    "Medical Clean",
    "Calm clinical blues for healthcare brands.",
    "industry",
    palette({
      primary: "#0369a1",
      secondary: "#0c4a6e",
      accent: "#14b8a6",
      background: "#f0f9ff",
      surface: "#ffffff",
      border: "#bae6fd",
      textPrimary: "#0c4a6e",
      textSecondary: "#0369a1",
      muted: "#0284c7",
      hover: "#0284c7",
      active: "#075985",
      success: "#0f766e",
    }),
    darkPalette({
      primary: "#7dd3fc",
      accent: "#5eead4",
      background: "#0c4a6e",
      surface: "#075985",
    }),
    {
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "rounded",
        shadow: "none",
      },
      animations: {
        ...DEFAULT_THEME_TOKENS.animations,
        entrance: "fade",
        speed: "slow",
      },
    },
  ),
  buildPreset(
    "education-blue",
    "Education Blue",
    "Friendly academic blues for schools and courses.",
    "industry",
    palette({
      primary: "#1d4ed8",
      secondary: "#1e40af",
      accent: "#f59e0b",
      background: "#eff6ff",
      surface: "#ffffff",
      border: "#bfdbfe",
      textPrimary: "#1e3a8a",
      textSecondary: "#1d4ed8",
      muted: "#3b82f6",
      hover: "#1e40af",
      active: "#1e3a8a",
    }),
    darkPalette({
      primary: "#93c5fd",
      accent: "#fbbf24",
      background: "#1e3a8a",
      surface: "#1e40af",
    }),
    {
      spacing: {
        ...DEFAULT_THEME_TOKENS.spacing,
        sectionPadding: "xl",
        gridGap: "2rem",
      },
      cards: {
        ...DEFAULT_THEME_TOKENS.cards,
        hoverLift: true,
      },
    },
  ),
  buildPreset(
    "startup-neon",
    "Startup Neon",
    "High-contrast neon accents for bold startups.",
    "tech",
    palette({
      primary: "#a3e635",
      secondary: "#65a30d",
      accent: "#f472b6",
      background: "#09090b",
      surface: "#18181b",
      border: "#3f3f46",
      textPrimary: "#fafafa",
      textSecondary: "#e4e4e7",
      muted: "#a1a1aa",
      hover: "#bef264",
      active: "#d9f99d",
    }),
    darkPalette({
      primary: "#a3e635",
      accent: "#f472b6",
      background: "#000000",
      surface: "#09090b",
    }),
    {
      typography: {
        ...DEFAULT_THEME_TOKENS.typography,
        headingFont: "ui-sans-serif, system-ui, sans-serif",
        letterSpacing: "-0.02em",
      },
      buttons: {
        ...DEFAULT_THEME_TOKENS.buttons,
        shape: "pill",
        hoverAnimation: "glow",
        shadow: "medium",
      },
      animations: {
        ...DEFAULT_THEME_TOKENS.animations,
        entrance: "slide",
        speed: "fast",
      },
      header: { ...DEFAULT_THEME_TOKENS.header, style: "glass" },
    },
  ),
];

/** Legacy create-wizard aliases mapped to studio presets. */
export const LEGACY_WIZARD_PRESET_MAP: Record<string, string> = {
  ink: "minimal-white",
  ocean: "modern-blue",
  ember: "restaurant-earth",
  forest: "nature-green",
};

export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}

export function detectPresetId(tokens: ThemeTokens): string | null {
  if (tokens.presetId && getThemePreset(tokens.presetId)) {
    return tokens.presetId;
  }
  const match = THEME_PRESETS.find(
    (preset) =>
      preset.tokens.colors.primary.toLowerCase() ===
        tokens.colors.primary.toLowerCase() &&
      preset.tokens.colors.background.toLowerCase() ===
        tokens.colors.background.toLowerCase(),
  );
  return match?.id ?? null;
}

export function presetDisplayName(primaryColor: string): string {
  const match = THEME_PRESETS.find(
    (preset) =>
      preset.tokens.colors.primary.toLowerCase() === primaryColor.toLowerCase(),
  );
  if (match) return match.name;
  const legacy: Record<string, string> = {
    "#18181b": "Minimal White",
    "#0f4c5c": "Modern Blue",
    "#9a3412": "Restaurant Earth",
    "#14532d": "Nature Green",
  };
  return legacy[primaryColor.toLowerCase()] ?? "Custom";
}
