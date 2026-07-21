export type ThemeFontOption = {
  id: string;
  label: string;
  stack: string;
  /** Google Fonts family name when available — ready for future loader. */
  googleFamily?: string;
  category: "serif" | "sans" | "display" | "mono";
};

export const THEME_FONT_OPTIONS: ThemeFontOption[] = [
  {
    id: "system-sans",
    label: "System Sans",
    stack: "ui-sans-serif, system-ui, sans-serif",
    category: "sans",
  },
  {
    id: "system-serif",
    label: "System Serif",
    stack: "ui-serif, Georgia, Cambria, serif",
    category: "serif",
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
    category: "serif",
  },
  {
    id: "inter",
    label: "Inter",
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    googleFamily: "Inter",
    category: "sans",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    stack: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    googleFamily: "DM Sans",
    category: "sans",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    googleFamily: "Space Grotesk",
    category: "sans",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    stack: "'Playfair Display', Georgia, serif",
    googleFamily: "Playfair Display",
    category: "display",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    stack: "'Libre Baskerville', Georgia, serif",
    googleFamily: "Libre Baskerville",
    category: "serif",
  },
  {
    id: "source-serif",
    label: "Source Serif 4",
    stack: "'Source Serif 4', Georgia, serif",
    googleFamily: "Source Serif 4",
    category: "serif",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: "'JetBrains Mono', ui-monospace, monospace",
    googleFamily: "JetBrains Mono",
    category: "mono",
  },
];

export function fontOptionForStack(stack: string): ThemeFontOption | undefined {
  return THEME_FONT_OPTIONS.find((font) => font.stack === stack);
}

/** Build a Google Fonts CSS URL for families used in the theme (ready for injection). */
export function googleFontsUrlForStacks(stacks: string[]): string | null {
  const families = new Set<string>();
  for (const stack of stacks) {
    const option = fontOptionForStack(stack);
    if (option?.googleFamily) families.add(option.googleFamily);
  }
  if (families.size === 0) return null;
  const query = [...families]
    .map((family) => `family=${encodeURIComponent(family)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
