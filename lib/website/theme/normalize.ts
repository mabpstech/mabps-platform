import type { ButtonStyle } from "@/lib/website/types";
import { DEFAULT_THEME_TOKENS } from "@/lib/website/theme/defaults";
import type {
  ThemeButtonVariant,
  ThemeColorPalette,
  ThemeTokens,
} from "@/lib/website/theme/types";
import { THEME_COLOR_KEYS } from "@/lib/website/theme/types";

export type LegacyThemeFields = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: string;
  buttonStyle: ButtonStyle;
  logoMediaId: string | null;
  faviconMediaId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  if (value === null) return null;
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mergePalette(
  base: ThemeColorPalette,
  incoming: unknown,
): ThemeColorPalette {
  if (!isRecord(incoming)) return { ...base };
  const next = { ...base };
  for (const key of THEME_COLOR_KEYS) {
    const value = incoming[key];
    if (typeof value === "string" && value.length > 0) {
      next[key] = value;
    }
  }
  return next;
}

function mergeDeepTokens(
  base: ThemeTokens,
  incoming: Partial<ThemeTokens> | Record<string, unknown>,
): ThemeTokens {
  const src = incoming as Partial<ThemeTokens>;
  return {
    version: 1,
    presetId:
      src.presetId === null
        ? null
        : typeof src.presetId === "string"
          ? src.presetId
          : base.presetId,
    brand: {
      businessName: asNullableString(src.brand?.businessName) ?? base.brand.businessName,
      slogan: asNullableString(src.brand?.slogan) ?? base.brand.slogan,
      logoMediaId:
        src.brand && "logoMediaId" in src.brand
          ? asNullableString(src.brand.logoMediaId)
          : base.brand.logoMediaId,
      faviconMediaId:
        src.brand && "faviconMediaId" in src.brand
          ? asNullableString(src.brand.faviconMediaId)
          : base.brand.faviconMediaId,
      brandImageMediaId:
        src.brand && "brandImageMediaId" in src.brand
          ? asNullableString(src.brand.brandImageMediaId)
          : base.brand.brandImageMediaId,
    },
    colors: mergePalette(base.colors, src.colors),
    darkMode: {
      enabled: asBoolean(src.darkMode?.enabled, base.darkMode.enabled),
      preview: asBoolean(src.darkMode?.preview, base.darkMode.preview),
      colors: mergePalette(base.darkMode.colors, src.darkMode?.colors),
    },
    typography: {
      headingFont: asString(src.typography?.headingFont, base.typography.headingFont),
      bodyFont: asString(src.typography?.bodyFont, base.typography.bodyFont),
      buttonFont: asString(src.typography?.buttonFont, base.typography.buttonFont),
      navigationFont: asString(
        src.typography?.navigationFont,
        base.typography.navigationFont,
      ),
      scale: (src.typography?.scale as ThemeTokens["typography"]["scale"]) || base.typography.scale,
      headingWeight: asNumber(src.typography?.headingWeight, base.typography.headingWeight),
      bodyWeight: asNumber(src.typography?.bodyWeight, base.typography.bodyWeight),
      letterSpacing: asString(src.typography?.letterSpacing, base.typography.letterSpacing),
      lineHeight: asString(src.typography?.lineHeight, base.typography.lineHeight),
      paragraphWidth: asString(src.typography?.paragraphWidth, base.typography.paragraphWidth),
    },
    buttons: {
      defaultVariant:
        (src.buttons?.defaultVariant as ThemeButtonVariant) ||
        base.buttons.defaultVariant,
      shape: src.buttons?.shape || base.buttons.shape,
      shadow: src.buttons?.shadow || base.buttons.shadow,
      hoverAnimation: src.buttons?.hoverAnimation || base.buttons.hoverAnimation,
    },
    spacing: {
      sectionPadding: src.spacing?.sectionPadding || base.spacing.sectionPadding,
      containerWidth: asString(src.spacing?.containerWidth, base.spacing.containerWidth),
      gridGap: asString(src.spacing?.gridGap, base.spacing.gridGap),
      cardPadding: asString(src.spacing?.cardPadding, base.spacing.cardPadding),
      contentWidth: asString(src.spacing?.contentWidth, base.spacing.contentWidth),
      maxWebsiteWidth: asString(
        src.spacing?.maxWebsiteWidth,
        base.spacing.maxWebsiteWidth,
      ),
    },
    borders: {
      globalRadius: asString(src.borders?.globalRadius, base.borders.globalRadius),
      cardRadius: asString(src.borders?.cardRadius, base.borders.cardRadius),
      buttonRadius: asString(src.borders?.buttonRadius, base.borders.buttonRadius),
      inputRadius: asString(src.borders?.inputRadius, base.borders.inputRadius),
      imageRadius: asString(src.borders?.imageRadius, base.borders.imageRadius),
      preset: src.borders?.preset || base.borders.preset,
    },
    shadows: {
      card: src.shadows?.card || base.shadows.card,
      button: src.shadows?.button || base.shadows.button,
      dropdown: src.shadows?.dropdown || base.shadows.dropdown,
      modal: src.shadows?.modal || base.shadows.modal,
      navigation: src.shadows?.navigation || base.shadows.navigation,
      hero: src.shadows?.hero || base.shadows.hero,
      footer: src.shadows?.footer || base.shadows.footer,
    },
    icons: {
      style: src.icons?.style || base.icons.style,
    },
    animations: {
      entrance: src.animations?.entrance || base.animations.entrance,
      duration: asString(src.animations?.duration, base.animations.duration),
      speed: src.animations?.speed || base.animations.speed,
      disabled: asBoolean(src.animations?.disabled, base.animations.disabled),
      reduceMotion: asBoolean(
        src.animations?.reduceMotion,
        base.animations.reduceMotion,
      ),
    },
    header: {
      style: src.header?.style || base.header.style,
      shadow: asBoolean(src.header?.shadow, base.header.shadow),
      announcementBar: asBoolean(
        src.header?.announcementBar,
        base.header.announcementBar,
      ),
      navHeight: src.header?.navHeight || base.header.navHeight,
      logoPosition: src.header?.logoPosition || base.header.logoPosition,
      menuAlignment: src.header?.menuAlignment || base.header.menuAlignment,
    },
    footer: {
      columns: asNumber(src.footer?.columns, base.footer.columns),
      showNewsletter: asBoolean(
        src.footer?.showNewsletter,
        base.footer.showNewsletter,
      ),
      showSocial: asBoolean(src.footer?.showSocial, base.footer.showSocial),
      showCopyright: asBoolean(
        src.footer?.showCopyright,
        base.footer.showCopyright,
      ),
      background:
        src.footer && "background" in src.footer
          ? asNullableString(src.footer.background)
          : base.footer.background,
      spacing: src.footer?.spacing || base.footer.spacing,
    },
    forms: {
      inputStyle: src.forms?.inputStyle || base.forms.inputStyle,
      focusRing: asBoolean(src.forms?.focusRing, base.forms.focusRing),
    },
    cards: {
      style: src.cards?.style || base.cards.style,
      border: asBoolean(src.cards?.border, base.cards.border),
      shadow: src.cards?.shadow || base.cards.shadow,
      radius:
        src.cards && "radius" in src.cards
          ? asNullableString(src.cards.radius)
          : base.cards.radius,
      hoverLift: asBoolean(src.cards?.hoverLift, base.cards.hoverLift),
      hoverScale: asBoolean(src.cards?.hoverScale, base.cards.hoverScale),
    },
    sections: {
      spacing: src.sections?.spacing || base.sections.spacing,
      alternatingBackgrounds: asBoolean(
        src.sections?.alternatingBackgrounds,
        base.sections.alternatingBackgrounds,
      ),
      alternateBackground:
        src.sections && "alternateBackground" in src.sections
          ? asNullableString(src.sections.alternateBackground)
          : base.sections.alternateBackground,
      containerPreset:
        src.sections?.containerPreset || base.sections.containerPreset,
    },
  };
}

export function tokensFromLegacy(legacy: LegacyThemeFields): ThemeTokens {
  const base = structuredClone(DEFAULT_THEME_TOKENS);
  return {
    ...base,
    presetId: null,
    brand: {
      ...base.brand,
      logoMediaId: legacy.logoMediaId,
      faviconMediaId: legacy.faviconMediaId,
    },
    colors: {
      ...base.colors,
      primary: legacy.primaryColor,
      secondary: legacy.secondaryColor,
      background: legacy.backgroundColor,
      surface: legacy.backgroundColor,
      textPrimary: legacy.textColor,
      textSecondary: legacy.secondaryColor,
      muted: legacy.mutedColor,
      hover: legacy.primaryColor,
      active: legacy.secondaryColor,
    },
    typography: {
      ...base.typography,
      headingFont: legacy.fontHeading,
      bodyFont: legacy.fontBody,
      buttonFont: legacy.fontBody,
      navigationFont: legacy.fontBody,
    },
    borders: {
      ...base.borders,
      globalRadius: legacy.borderRadius,
      cardRadius: legacy.borderRadius,
      buttonRadius: legacy.borderRadius,
      inputRadius: legacy.borderRadius,
      imageRadius: legacy.borderRadius,
    },
    buttons: {
      ...base.buttons,
      defaultVariant: legacy.buttonStyle,
    },
  };
}

export function normalizeThemeTokens(
  raw: unknown,
  legacy?: LegacyThemeFields,
): ThemeTokens {
  const fromLegacy = legacy
    ? tokensFromLegacy(legacy)
    : structuredClone(DEFAULT_THEME_TOKENS);

  if (!isRecord(raw) || Object.keys(raw).length === 0) {
    return fromLegacy;
  }

  return mergeDeepTokens(fromLegacy, raw as Partial<ThemeTokens>);
}

export function buttonStyleFromVariant(
  variant: ThemeButtonVariant,
): ButtonStyle {
  if (variant === "ghost") return "outline";
  return variant;
}

export function coreFieldsFromTokens(tokens: ThemeTokens): LegacyThemeFields {
  return {
    primaryColor: tokens.colors.primary,
    secondaryColor: tokens.colors.secondary,
    backgroundColor: tokens.colors.background,
    textColor: tokens.colors.textPrimary,
    mutedColor: tokens.colors.muted,
    fontHeading: tokens.typography.headingFont,
    fontBody: tokens.typography.bodyFont,
    borderRadius: tokens.borders.globalRadius,
    buttonStyle: buttonStyleFromVariant(tokens.buttons.defaultVariant),
    logoMediaId: tokens.brand.logoMediaId,
    faviconMediaId: tokens.brand.faviconMediaId,
  };
}

export function applyRadiusPreset(
  tokens: ThemeTokens,
  preset: ThemeTokens["borders"]["preset"],
): ThemeTokens {
  const map = {
    sharp: "0px",
    soft: "0.375rem",
    rounded: "0.5rem",
    pill: "9999px",
  } as const;
  const value = map[preset];
  return {
    ...tokens,
    presetId: null,
    borders: {
      ...tokens.borders,
      preset,
      globalRadius: value === "9999px" ? "1rem" : value,
      cardRadius: value === "9999px" ? "1.25rem" : value,
      buttonRadius: value,
      inputRadius: value === "9999px" ? "0.75rem" : value,
      imageRadius: value === "9999px" ? "1rem" : value,
    },
  };
}

export function resolveActiveColors(tokens: ThemeTokens): ThemeColorPalette {
  if (tokens.darkMode.enabled && tokens.darkMode.preview) {
    return tokens.darkMode.colors;
  }
  return tokens.colors;
}
