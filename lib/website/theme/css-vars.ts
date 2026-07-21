import type { ThemeShadowLevel, ThemeTokens } from "@/lib/website/theme/types";
import { resolveActiveColors } from "@/lib/website/theme/normalize";

const SHADOW_CSS: Record<ThemeShadowLevel, string> = {
  none: "none",
  soft: "0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
  medium: "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
  strong: "0 16px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1)",
};

const SECTION_PADDING: Record<ThemeTokens["spacing"]["sectionPadding"], string> = {
  sm: "2.5rem",
  md: "3.5rem",
  lg: "4.5rem",
  xl: "6rem",
};

const FONT_SCALE: Record<
  ThemeTokens["typography"]["scale"],
  { h1: string; h2: string; body: string; small: string }
> = {
  sm: { h1: "2rem", h2: "1.5rem", body: "0.9375rem", small: "0.8125rem" },
  md: { h1: "2.5rem", h2: "1.75rem", body: "1rem", small: "0.875rem" },
  lg: { h1: "3rem", h2: "2rem", body: "1.0625rem", small: "0.9375rem" },
};

const CONTAINER_WIDTH: Record<ThemeTokens["sections"]["containerPreset"], string> = {
  narrow: "48rem",
  default: "64rem",
  wide: "80rem",
  full: "100%",
};

const SPEED_MS: Record<ThemeTokens["animations"]["speed"], string> = {
  slow: "480ms",
  normal: "280ms",
  fast: "160ms",
};

export function themeTokensToCssVars(
  tokens: ThemeTokens,
  options?: { darkPreview?: boolean },
): Record<string, string> {
  const previewTokens: ThemeTokens = {
    ...tokens,
    darkMode: {
      ...tokens.darkMode,
      preview: options?.darkPreview ?? tokens.darkMode.preview,
    },
  };
  const colors = resolveActiveColors(previewTokens);
  const scale = FONT_SCALE[tokens.typography.scale];
  const duration =
    tokens.animations.disabled
      ? "0ms"
      : tokens.animations.duration || SPEED_MS[tokens.animations.speed];

  return {
    "--site-color-primary": colors.primary,
    "--site-color-secondary": colors.secondary,
    "--site-color-accent": colors.accent,
    "--site-color-success": colors.success,
    "--site-color-warning": colors.warning,
    "--site-color-danger": colors.danger,
    "--site-color-background": colors.background,
    "--site-color-surface": colors.surface,
    "--site-color-border": colors.border,
    "--site-color-text": colors.textPrimary,
    "--site-color-text-secondary": colors.textSecondary,
    "--site-color-muted": colors.muted,
    "--site-color-hover": colors.hover,
    "--site-color-active": colors.active,

    "--site-font-heading": tokens.typography.headingFont,
    "--site-font-body": tokens.typography.bodyFont,
    "--site-font-button": tokens.typography.buttonFont,
    "--site-font-nav": tokens.typography.navigationFont,
    "--site-font-heading-weight": String(tokens.typography.headingWeight),
    "--site-font-body-weight": String(tokens.typography.bodyWeight),
    "--site-letter-spacing": tokens.typography.letterSpacing,
    "--site-line-height": tokens.typography.lineHeight,
    "--site-paragraph-width": tokens.typography.paragraphWidth,
    "--site-font-size-h1": scale.h1,
    "--site-font-size-h2": scale.h2,
    "--site-font-size-body": scale.body,
    "--site-font-size-small": scale.small,

    "--site-radius": tokens.borders.globalRadius,
    "--site-radius-card": tokens.borders.cardRadius,
    "--site-radius-button": tokens.borders.buttonRadius,
    "--site-radius-input": tokens.borders.inputRadius,
    "--site-radius-image": tokens.borders.imageRadius,

    "--site-shadow-card": SHADOW_CSS[tokens.shadows.card],
    "--site-shadow-button": SHADOW_CSS[tokens.shadows.button],
    "--site-shadow-dropdown": SHADOW_CSS[tokens.shadows.dropdown],
    "--site-shadow-modal": SHADOW_CSS[tokens.shadows.modal],
    "--site-shadow-nav": SHADOW_CSS[tokens.shadows.navigation],
    "--site-shadow-hero": SHADOW_CSS[tokens.shadows.hero],
    "--site-shadow-footer": SHADOW_CSS[tokens.shadows.footer],

    "--site-section-padding": SECTION_PADDING[tokens.sections.spacing],
    "--site-container-width":
      CONTAINER_WIDTH[tokens.sections.containerPreset] ||
      tokens.spacing.containerWidth,
    "--site-grid-gap": tokens.spacing.gridGap,
    "--site-card-padding": tokens.spacing.cardPadding,
    "--site-content-width": tokens.spacing.contentWidth,
    "--site-max-width": tokens.spacing.maxWebsiteWidth,

    "--site-animation-duration": duration,
    "--site-animation-entrance": tokens.animations.entrance,
    "--site-icon-style": tokens.icons.style,
  };
}

export function cssVarsToInlineStyle(
  vars: Record<string, string>,
): Record<string, string> {
  return vars;
}

export function themeTokensToStyleTag(tokens: ThemeTokens): string {
  const vars = themeTokensToCssVars(tokens);
  const declarations = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");

  const reduceMotion = tokens.animations.reduceMotion
    ? `
@media (prefers-reduced-motion: reduce) {
  .mabps-site, .mabps-site * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`
    : "";

  return `:root, .mabps-site {\n${declarations}\n}${reduceMotion}`;
}

export function shadowCss(level: ThemeShadowLevel): string {
  return SHADOW_CSS[level];
}
