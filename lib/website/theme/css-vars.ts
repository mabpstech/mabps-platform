import type { ThemeShadowLevel, ThemeTokens } from "@/lib/website/theme/types";
import { resolveActiveColors } from "@/lib/website/theme/normalize";

const SHADOW_CSS: Record<ThemeShadowLevel, string> = {
  none: "none",
  soft: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)",
  medium: "0 4px 16px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.08)",
  strong: "0 16px 48px rgba(15,23,42,0.14), 0 8px 20px rgba(15,23,42,0.08)",
};

const SECTION_PADDING: Record<ThemeTokens["spacing"]["sectionPadding"], string> = {
  sm: "3rem",
  md: "4.5rem",
  lg: "6rem",
  xl: "7.5rem",
};

const FONT_SCALE: Record<
  ThemeTokens["typography"]["scale"],
  { h1: string; h2: string; body: string; small: string }
> = {
  sm: {
    h1: "clamp(2rem, 4.5vw, 2.5rem)",
    h2: "clamp(1.375rem, 2.5vw, 1.625rem)",
    body: "0.9375rem",
    small: "0.8125rem",
  },
  md: {
    h1: "clamp(2.35rem, 5vw, 3.25rem)",
    h2: "clamp(1.5rem, 3vw, 2rem)",
    body: "1.0625rem",
    small: "0.875rem",
  },
  lg: {
    h1: "clamp(2.75rem, 6vw, 4rem)",
    h2: "clamp(1.75rem, 3.5vw, 2.375rem)",
    body: "1.125rem",
    small: "0.9375rem",
  },
};

const CONTAINER_WIDTH: Record<ThemeTokens["sections"]["containerPreset"], string> = {
  narrow: "48rem",
  default: "72rem",
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

  const hoverRules = `
.mabps-site .site-card {
  transition: transform var(--site-animation-duration) ease, box-shadow var(--site-animation-duration) ease, border-color var(--site-animation-duration) ease;
}
.mabps-site .site-card[data-hover-lift="true"]:hover {
  transform: translateY(-4px);
  box-shadow: ${SHADOW_CSS.medium};
}
.mabps-site .site-card[data-hover-scale="true"]:hover {
  transform: translateY(-2px) scale(1.01);
}
.mabps-site .site-btn {
  transition: transform var(--site-animation-duration) ease, box-shadow var(--site-animation-duration) ease, opacity var(--site-animation-duration) ease, background-color var(--site-animation-duration) ease;
}
.mabps-site .site-btn:hover {
  opacity: 0.94;
}
.mabps-site .site-btn[data-hover="lift"]:hover {
  transform: translateY(-2px);
  box-shadow: ${SHADOW_CSS.medium};
}
.mabps-site .site-btn[data-hover="scale"]:hover {
  transform: scale(1.03);
}
.mabps-site .site-btn[data-hover="glow"]:hover {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--site-color-primary) 22%, transparent), ${SHADOW_CSS.medium};
}
.mabps-site .site-nav-link {
  position: relative;
  transition: color var(--site-animation-duration) ease, opacity var(--site-animation-duration) ease;
}
.mabps-site .site-nav-link:hover {
  color: var(--site-color-text);
  opacity: 1;
}
.mabps-site a:focus-visible,
.mabps-site button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--site-color-accent) 70%, transparent);
  outline-offset: 3px;
}`;

  return `:root, .mabps-site {\n${declarations}\n}${hoverRules}${reduceMotion}`;
}

export function shadowCss(level: ThemeShadowLevel): string {
  return SHADOW_CSS[level];
}
