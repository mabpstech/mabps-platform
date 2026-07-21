import { DEFAULT_THEME_TOKENS } from "@/lib/website/theme/defaults";
import { normalizeThemeTokens } from "@/lib/website/theme/normalize";
import type { ThemeExportPayload, ThemeTokens } from "@/lib/website/theme/types";

export function exportThemeTokens(
  tokens: ThemeTokens,
  name?: string,
): ThemeExportPayload {
  return {
    format: "mabps-theme",
    version: 1,
    exportedAt: new Date().toISOString(),
    name,
    tokens: structuredClone(tokens),
  };
}

export function serializeThemeExport(
  tokens: ThemeTokens,
  name?: string,
): string {
  return JSON.stringify(exportThemeTokens(tokens, name), null, 2);
}

export function parseThemeImport(raw: string): ThemeTokens {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid theme JSON.");
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "format" in parsed &&
    (parsed as ThemeExportPayload).format === "mabps-theme" &&
    "tokens" in parsed
  ) {
    return normalizeThemeTokens((parsed as ThemeExportPayload).tokens);
  }

  if (typeof parsed === "object" && parsed !== null && "colors" in parsed) {
    return normalizeThemeTokens(parsed);
  }

  throw new Error("Unrecognized theme file. Export a MABPS theme JSON first.");
}

export function duplicateThemeTokens(tokens: ThemeTokens): ThemeTokens {
  return {
    ...structuredClone(tokens),
    presetId: null,
  };
}

export function resetThemeTokens(): ThemeTokens {
  return structuredClone(DEFAULT_THEME_TOKENS);
}
