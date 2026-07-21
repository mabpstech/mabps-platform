import type { ButtonStyle } from "@/lib/website/types";

export const THEME_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
  "background",
  "surface",
  "border",
  "textPrimary",
  "textSecondary",
  "muted",
  "hover",
  "active",
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export type ThemeColorPalette = Record<ThemeColorKey, string>;

export type ThemeFontScale = "sm" | "md" | "lg";
export type ThemeShadowLevel = "none" | "soft" | "medium" | "strong";
export type ThemeRadiusPreset = "sharp" | "soft" | "rounded" | "pill";
export type ThemeButtonShape = "rounded" | "pill" | "square";
export type ThemeButtonVariant = ButtonStyle | "ghost";
export type ThemeHoverAnimation = "none" | "lift" | "scale" | "glow";
export type ThemeIconStyle = "outlined" | "filled" | "rounded" | "minimal";
export type ThemeEntrance = "none" | "fade" | "slide" | "zoom" | "scale";
export type ThemeSpeed = "slow" | "normal" | "fast";
export type ThemeHeaderStyle = "sticky" | "transparent" | "solid" | "glass";
export type ThemeLogoPosition = "left" | "center";
export type ThemeMenuAlignment = "left" | "center" | "right";
export type ThemeNavHeight = "sm" | "md" | "lg";
export type ThemeSpacingSize = "sm" | "md" | "lg" | "xl";
export type ThemeContainerPreset = "narrow" | "default" | "wide" | "full";
export type ThemeInputStyle = "outline" | "filled" | "underline";
export type ThemeCardStyle = "elevated" | "outlined" | "flat";

export type ThemeBrandTokens = {
  businessName: string | null;
  slogan: string | null;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  brandImageMediaId: string | null;
};

export type ThemeTypographyTokens = {
  headingFont: string;
  bodyFont: string;
  buttonFont: string;
  navigationFont: string;
  scale: ThemeFontScale;
  headingWeight: number;
  bodyWeight: number;
  letterSpacing: string;
  lineHeight: string;
  paragraphWidth: string;
};

export type ThemeButtonTokens = {
  defaultVariant: ThemeButtonVariant;
  shape: ThemeButtonShape;
  shadow: ThemeShadowLevel;
  hoverAnimation: ThemeHoverAnimation;
};

export type ThemeSpacingTokens = {
  sectionPadding: ThemeSpacingSize;
  containerWidth: string;
  gridGap: string;
  cardPadding: string;
  contentWidth: string;
  maxWebsiteWidth: string;
};

export type ThemeBorderTokens = {
  globalRadius: string;
  cardRadius: string;
  buttonRadius: string;
  inputRadius: string;
  imageRadius: string;
  preset: ThemeRadiusPreset;
};

export type ThemeShadowTokens = {
  card: ThemeShadowLevel;
  button: ThemeShadowLevel;
  dropdown: ThemeShadowLevel;
  modal: ThemeShadowLevel;
  navigation: ThemeShadowLevel;
  hero: ThemeShadowLevel;
  footer: ThemeShadowLevel;
};

export type ThemeIconTokens = {
  style: ThemeIconStyle;
};

export type ThemeAnimationTokens = {
  entrance: ThemeEntrance;
  duration: string;
  speed: ThemeSpeed;
  disabled: boolean;
  reduceMotion: boolean;
};

export type ThemeHeaderTokens = {
  style: ThemeHeaderStyle;
  shadow: boolean;
  announcementBar: boolean;
  navHeight: ThemeNavHeight;
  logoPosition: ThemeLogoPosition;
  menuAlignment: ThemeMenuAlignment;
};

export type ThemeFooterTokens = {
  columns: number;
  showNewsletter: boolean;
  showSocial: boolean;
  showCopyright: boolean;
  background: string | null;
  spacing: Exclude<ThemeSpacingSize, "xl">;
};

export type ThemeFormTokens = {
  inputStyle: ThemeInputStyle;
  focusRing: boolean;
};

export type ThemeCardTokens = {
  style: ThemeCardStyle;
  border: boolean;
  shadow: ThemeShadowLevel;
  radius: string | null;
  hoverLift: boolean;
  hoverScale: boolean;
};

export type ThemeSectionTokens = {
  spacing: ThemeSpacingSize;
  alternatingBackgrounds: boolean;
  alternateBackground: string | null;
  containerPreset: ThemeContainerPreset;
};

export type ThemeDarkModeTokens = {
  enabled: boolean;
  preview: boolean;
  colors: ThemeColorPalette;
};

export type ThemeTokens = {
  version: 1;
  presetId: string | null;
  brand: ThemeBrandTokens;
  colors: ThemeColorPalette;
  darkMode: ThemeDarkModeTokens;
  typography: ThemeTypographyTokens;
  buttons: ThemeButtonTokens;
  spacing: ThemeSpacingTokens;
  borders: ThemeBorderTokens;
  shadows: ThemeShadowTokens;
  icons: ThemeIconTokens;
  animations: ThemeAnimationTokens;
  header: ThemeHeaderTokens;
  footer: ThemeFooterTokens;
  forms: ThemeFormTokens;
  cards: ThemeCardTokens;
  sections: ThemeSectionTokens;
};

export type ThemeExportPayload = {
  format: "mabps-theme";
  version: 1;
  exportedAt: string;
  name?: string;
  tokens: ThemeTokens;
};

export type ContrastIssue = {
  pair: string;
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
};
