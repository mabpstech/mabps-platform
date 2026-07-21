import type { ContrastIssue, ThemeColorPalette, ThemeTokens } from "@/lib/website/theme/types";
import { resolveActiveColors } from "@/lib/website/theme/normalize";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return (
    0.2126 * channelLuminance(rgb.r) +
    0.7152 * channelLuminance(rgb.g) +
    0.0722 * channelLuminance(rgb.b)
  );
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesContrastAA(
  foreground: string,
  background: string,
  largeText = false,
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return true;
  return ratio >= (largeText ? 3 : 4.5);
}

function issue(
  pair: string,
  foreground: string,
  background: string,
): ContrastIssue | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return null;
  return {
    pair,
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
  };
}

export function validateThemeContrast(
  tokens: ThemeTokens,
  useDark = false,
): ContrastIssue[] {
  const colors: ThemeColorPalette =
    useDark && tokens.darkMode.enabled ? tokens.darkMode.colors : resolveActiveColors(tokens);

  const checks = [
    issue("Body text on background", colors.textPrimary, colors.background),
    issue("Secondary text on background", colors.textSecondary, colors.background),
    issue("Muted text on background", colors.muted, colors.background),
    issue("Body text on surface", colors.textPrimary, colors.surface),
    issue("Primary on background", colors.primary, colors.background),
    issue("White on primary (buttons)", "#ffffff", colors.primary),
  ];

  return checks.filter((item): item is ContrastIssue => item !== null);
}

/** Suggest a readable text color (black/white) for a given background. */
export function readableOn(background: string): string {
  const luminance = relativeLuminance(background);
  if (luminance === null) return "#18181b";
  return luminance > 0.45 ? "#18181b" : "#ffffff";
}
