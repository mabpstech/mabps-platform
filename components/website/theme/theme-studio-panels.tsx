"use client";

import { MediaPicker } from "@/components/website/media-picker";
import {
  ChoiceGrid,
  ColorField,
  SelectField,
  StudioSection,
  TextField,
  ToggleField,
  type StudioNavId,
} from "@/components/website/theme/controls";
import {
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import {
  THEME_FONT_OPTIONS,
  THEME_PRESETS,
  applyRadiusPreset,
  themePresetSwatchKey,
  validateThemeContrast,
} from "@/lib/website/theme";
import { THEME_COLOR_KEYS, type ThemeTokens } from "@/lib/website/theme/types";

const COLOR_LABELS: Record<(typeof THEME_COLOR_KEYS)[number], string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  success: "Success",
  warning: "Warning",
  danger: "Danger",
  background: "Background",
  surface: "Surface",
  border: "Border",
  textPrimary: "Text primary",
  textSecondary: "Text secondary",
  muted: "Muted",
  hover: "Hover",
  active: "Active",
};

export function ThemeStudioPanels({
  section,
  tokens,
  customCss,
  siteId,
  canManage,
  onTokens,
  onCustomCss,
  importText,
  onImportText,
  onImport,
  onExport,
  onDuplicate,
  onReset,
}: {
  section: StudioNavId;
  tokens: ThemeTokens;
  customCss: string | null;
  siteId: string;
  canManage: boolean;
  onTokens: (next: ThemeTokens) => void;
  onCustomCss: (value: string | null) => void;
  importText: string;
  onImportText: (value: string) => void;
  onImport: () => void;
  onExport: () => void;
  onDuplicate: () => void;
  onReset: () => void;
}) {
  function patch(partial: Partial<ThemeTokens>) {
    onTokens({ ...tokens, ...partial, presetId: partial.presetId ?? null });
  }

  const contrastIssues = validateThemeContrast(tokens, tokens.darkMode.preview);
  const failing = contrastIssues.filter((issue) => !issue.passesAA);

  if (section === "presets") {
    return (
      <StudioSection
        title="Theme presets"
        description="Apply a complete visual identity in one click. You can fine-tune afterward."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_PRESETS.map((preset) => {
            const active = tokens.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!canManage}
                onClick={() => onTokens(structuredClone(preset.tokens))}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex h-12 overflow-hidden rounded-xl">
                  {preset.swatch.map((entry) => (
                    <div
                      key={themePresetSwatchKey(preset.id, entry.id)}
                      className="flex-1"
                      style={{ background: entry.color }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  {preset.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </StudioSection>
    );
  }

  if (section === "brand") {
    return (
      <div className="space-y-4">
        <StudioSection
          title="Brand"
          description="Core identity assets and messaging used across your website."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Business name"
              value={tokens.brand.businessName ?? ""}
              onChange={(businessName) =>
                patch({
                  brand: {
                    ...tokens.brand,
                    businessName: businessName || null,
                  },
                })
              }
              disabled={!canManage}
              placeholder="Acme Studio"
            />
            <TextField
              label="Brand slogan"
              value={tokens.brand.slogan ?? ""}
              onChange={(slogan) =>
                patch({
                  brand: { ...tokens.brand, slogan: slogan || null },
                })
              }
              disabled={!canManage}
              placeholder="Crafted for modern brands"
            />
          </div>
        </StudioSection>
        <StudioSection title="Brand images">
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaPicker
              siteId={siteId}
              value={tokens.brand.logoMediaId}
              onChange={(logoMediaId) =>
                patch({ brand: { ...tokens.brand, logoMediaId } })
              }
              disabled={!canManage}
              label="Website logo"
              hint="logo"
            />
            <MediaPicker
              siteId={siteId}
              value={tokens.brand.faviconMediaId}
              onChange={(faviconMediaId) =>
                patch({ brand: { ...tokens.brand, faviconMediaId } })
              }
              disabled={!canManage}
              label="Favicon"
              hint="favicon"
            />
            <div className="sm:col-span-2">
              <MediaPicker
                siteId={siteId}
                value={tokens.brand.brandImageMediaId}
                onChange={(brandImageMediaId) =>
                  patch({ brand: { ...tokens.brand, brandImageMediaId } })
                }
                disabled={!canManage}
                label="Brand image"
                hint="hero"
              />
            </div>
          </div>
        </StudioSection>
      </div>
    );
  }

  if (section === "colors") {
    return (
      <StudioSection
        title="Color system"
        description="Semantic colors power buttons, text, surfaces, and states across the site."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {THEME_COLOR_KEYS.map((key) => (
            <ColorField
              key={key}
              label={COLOR_LABELS[key]}
              value={tokens.colors[key]}
              onChange={(value) =>
                patch({
                  colors: { ...tokens.colors, [key]: value },
                })
              }
              disabled={!canManage}
            />
          ))}
        </div>
        {failing.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
            <p className="font-medium">Contrast needs attention</p>
            <ul className="mt-1.5 space-y-1">
              {failing.slice(0, 4).map((issue) => (
                <li key={issue.pair}>
                  {issue.pair}: {issue.ratio}:1 (needs 4.5:1)
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-xs text-emerald-700">
            Accessible contrast checks are passing for core text pairs.
          </p>
        )}
      </StudioSection>
    );
  }

  if (section === "typography") {
    const fontOptions = THEME_FONT_OPTIONS.map((font) => ({
      value: font.stack,
      label: font.label,
    }));
    return (
      <StudioSection
        title="Typography"
        description="Heading, body, button, and navigation fonts with a global type scale. Google Fonts ready."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Heading font"
            value={tokens.typography.headingFont}
            onChange={(headingFont) =>
              patch({
                typography: { ...tokens.typography, headingFont },
              })
            }
            disabled={!canManage}
            options={fontOptions}
          />
          <SelectField
            label="Body font"
            value={tokens.typography.bodyFont}
            onChange={(bodyFont) =>
              patch({ typography: { ...tokens.typography, bodyFont } })
            }
            disabled={!canManage}
            options={fontOptions}
          />
          <SelectField
            label="Button font"
            value={tokens.typography.buttonFont}
            onChange={(buttonFont) =>
              patch({ typography: { ...tokens.typography, buttonFont } })
            }
            disabled={!canManage}
            options={fontOptions}
          />
          <SelectField
            label="Navigation font"
            value={tokens.typography.navigationFont}
            onChange={(navigationFont) =>
              patch({
                typography: { ...tokens.typography, navigationFont },
              })
            }
            disabled={!canManage}
            options={fontOptions}
          />
          <SelectField
            label="Font size scale"
            value={tokens.typography.scale}
            onChange={(scale) =>
              patch({
                typography: {
                  ...tokens.typography,
                  scale: scale as ThemeTokens["typography"]["scale"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <SelectField
            label="Heading weight"
            value={String(tokens.typography.headingWeight)}
            onChange={(value) =>
              patch({
                typography: {
                  ...tokens.typography,
                  headingWeight: Number(value),
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "500", label: "Medium 500" },
              { value: "600", label: "Semibold 600" },
              { value: "700", label: "Bold 700" },
            ]}
          />
          <TextField
            label="Letter spacing"
            value={tokens.typography.letterSpacing}
            onChange={(letterSpacing) =>
              patch({ typography: { ...tokens.typography, letterSpacing } })
            }
            disabled={!canManage}
            placeholder="0"
          />
          <TextField
            label="Line height"
            value={tokens.typography.lineHeight}
            onChange={(lineHeight) =>
              patch({ typography: { ...tokens.typography, lineHeight } })
            }
            disabled={!canManage}
            placeholder="1.6"
          />
          <TextField
            label="Paragraph width"
            value={tokens.typography.paragraphWidth}
            onChange={(paragraphWidth) =>
              patch({ typography: { ...tokens.typography, paragraphWidth } })
            }
            disabled={!canManage}
            placeholder="42rem"
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "buttons") {
    return (
      <StudioSection
        title="Button system"
        description="Default variant, shape, shadow, and hover motion for site CTAs."
      >
        <div className="space-y-4">
          <ChoiceGrid
            value={tokens.buttons.defaultVariant}
            onChange={(defaultVariant) =>
              patch({
                buttons: {
                  ...tokens.buttons,
                  defaultVariant:
                    defaultVariant as ThemeTokens["buttons"]["defaultVariant"],
                },
              })
            }
            disabled={!canManage}
            columns={4}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
              { value: "outline", label: "Outline" },
              { value: "ghost", label: "Ghost" },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Shape"
              value={tokens.buttons.shape}
              onChange={(shape) =>
                patch({
                  buttons: {
                    ...tokens.buttons,
                    shape: shape as ThemeTokens["buttons"]["shape"],
                  },
                })
              }
              disabled={!canManage}
              options={[
                { value: "rounded", label: "Rounded" },
                { value: "pill", label: "Pill" },
                { value: "square", label: "Square" },
              ]}
            />
            <SelectField
              label="Shadow"
              value={tokens.buttons.shadow}
              onChange={(shadow) =>
                patch({
                  buttons: {
                    ...tokens.buttons,
                    shadow: shadow as ThemeTokens["buttons"]["shadow"],
                  },
                })
              }
              disabled={!canManage}
              options={[
                { value: "none", label: "None" },
                { value: "soft", label: "Soft" },
                { value: "medium", label: "Medium" },
                { value: "strong", label: "Strong" },
              ]}
            />
            <SelectField
              label="Hover animation"
              value={tokens.buttons.hoverAnimation}
              onChange={(hoverAnimation) =>
                patch({
                  buttons: {
                    ...tokens.buttons,
                    hoverAnimation:
                      hoverAnimation as ThemeTokens["buttons"]["hoverAnimation"],
                  },
                })
              }
              disabled={!canManage}
              options={[
                { value: "none", label: "None" },
                { value: "lift", label: "Lift" },
                { value: "scale", label: "Scale" },
                { value: "glow", label: "Glow" },
              ]}
            />
          </div>
          <p className="text-xs text-zinc-500">
            Loading and disabled states inherit primary colors with reduced
            opacity on published pages.
          </p>
        </div>
      </StudioSection>
    );
  }

  if (section === "spacing") {
    return (
      <StudioSection
        title="Spacing system"
        description="Global rhythm for sections, containers, cards, and content width."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Section padding"
            value={tokens.spacing.sectionPadding}
            onChange={(sectionPadding) =>
              patch({
                spacing: {
                  ...tokens.spacing,
                  sectionPadding:
                    sectionPadding as ThemeTokens["spacing"]["sectionPadding"],
                },
                sections: {
                  ...tokens.sections,
                  spacing:
                    sectionPadding as ThemeTokens["sections"]["spacing"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra large" },
            ]}
          />
          <TextField
            label="Container width"
            value={tokens.spacing.containerWidth}
            onChange={(containerWidth) =>
              patch({ spacing: { ...tokens.spacing, containerWidth } })
            }
            disabled={!canManage}
          />
          <TextField
            label="Grid gap"
            value={tokens.spacing.gridGap}
            onChange={(gridGap) =>
              patch({ spacing: { ...tokens.spacing, gridGap } })
            }
            disabled={!canManage}
          />
          <TextField
            label="Card padding"
            value={tokens.spacing.cardPadding}
            onChange={(cardPadding) =>
              patch({ spacing: { ...tokens.spacing, cardPadding } })
            }
            disabled={!canManage}
          />
          <TextField
            label="Content width"
            value={tokens.spacing.contentWidth}
            onChange={(contentWidth) =>
              patch({ spacing: { ...tokens.spacing, contentWidth } })
            }
            disabled={!canManage}
          />
          <TextField
            label="Maximum website width"
            value={tokens.spacing.maxWebsiteWidth}
            onChange={(maxWebsiteWidth) =>
              patch({ spacing: { ...tokens.spacing, maxWebsiteWidth } })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "borders") {
    return (
      <StudioSection
        title="Border system"
        description="Global radius presets with per-element overrides."
      >
        <ChoiceGrid
          value={tokens.borders.preset}
          onChange={(preset) =>
            onTokens(
              applyRadiusPreset(
                tokens,
                preset as ThemeTokens["borders"]["preset"],
              ),
            )
          }
          disabled={!canManage}
          columns={4}
          options={[
            { value: "sharp", label: "Sharp" },
            { value: "soft", label: "Soft" },
            { value: "rounded", label: "Rounded" },
            { value: "pill", label: "Pill" },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ["globalRadius", "Global radius"],
              ["cardRadius", "Card radius"],
              ["buttonRadius", "Button radius"],
              ["inputRadius", "Input radius"],
              ["imageRadius", "Image radius"],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              value={tokens.borders[key]}
              onChange={(value) =>
                patch({
                  borders: { ...tokens.borders, [key]: value },
                })
              }
              disabled={!canManage}
            />
          ))}
        </div>
      </StudioSection>
    );
  }

  if (section === "shadows") {
    const levels = [
      { value: "none", label: "None" },
      { value: "soft", label: "Soft" },
      { value: "medium", label: "Medium" },
      { value: "strong", label: "Strong" },
    ];
    return (
      <StudioSection
        title="Shadow system"
        description="Elevation for cards, buttons, overlays, and chrome."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["card", "Cards"],
              ["button", "Buttons"],
              ["dropdown", "Dropdowns"],
              ["modal", "Modals"],
              ["navigation", "Navigation"],
              ["hero", "Hero"],
              ["footer", "Footer"],
            ] as const
          ).map(([key, label]) => (
            <SelectField
              key={key}
              label={label}
              value={tokens.shadows[key]}
              onChange={(value) =>
                patch({
                  shadows: {
                    ...tokens.shadows,
                    [key]: value as ThemeTokens["shadows"][typeof key],
                  },
                })
              }
              disabled={!canManage}
              options={levels}
            />
          ))}
        </div>
      </StudioSection>
    );
  }

  if (section === "icons") {
    return (
      <StudioSection title="Icons" description="Global icon style for UI accents.">
        <ChoiceGrid
          value={tokens.icons.style}
          onChange={(style) =>
            patch({
              icons: {
                style: style as ThemeTokens["icons"]["style"],
              },
            })
          }
          disabled={!canManage}
          columns={4}
          options={[
            { value: "outlined", label: "Outlined" },
            { value: "filled", label: "Filled" },
            { value: "rounded", label: "Rounded" },
            { value: "minimal", label: "Minimal" },
          ]}
        />
      </StudioSection>
    );
  }

  if (section === "animations") {
    return (
      <StudioSection
        title="Animations"
        description="Entrance motion with reduce-motion support for accessibility."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Entrance"
            value={tokens.animations.entrance}
            onChange={(entrance) =>
              patch({
                animations: {
                  ...tokens.animations,
                  entrance: entrance as ThemeTokens["animations"]["entrance"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "none", label: "None" },
              { value: "fade", label: "Fade" },
              { value: "slide", label: "Slide" },
              { value: "zoom", label: "Zoom" },
              { value: "scale", label: "Scale" },
            ]}
          />
          <SelectField
            label="Speed"
            value={tokens.animations.speed}
            onChange={(speed) =>
              patch({
                animations: {
                  ...tokens.animations,
                  speed: speed as ThemeTokens["animations"]["speed"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "slow", label: "Slow" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ]}
          />
          <TextField
            label="Duration"
            value={tokens.animations.duration}
            onChange={(duration) =>
              patch({
                animations: { ...tokens.animations, duration },
              })
            }
            disabled={!canManage}
            placeholder="280ms"
          />
        </div>
        <div className="mt-4 space-y-2">
          <ToggleField
            label="Disable animations"
            description="Turns off motion site-wide."
            checked={tokens.animations.disabled}
            onChange={(disabled) =>
              patch({ animations: { ...tokens.animations, disabled } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Respect reduce motion"
            description="Honor the visitor’s prefers-reduced-motion setting."
            checked={tokens.animations.reduceMotion}
            onChange={(reduceMotion) =>
              patch({ animations: { ...tokens.animations, reduceMotion } })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "header") {
    return (
      <StudioSection
        title="Header style"
        description="Chrome behavior for navigation — detailed header content stays in Header editor."
      >
        <ChoiceGrid
          value={tokens.header.style}
          onChange={(style) =>
            patch({
              header: {
                ...tokens.header,
                style: style as ThemeTokens["header"]["style"],
              },
            })
          }
          disabled={!canManage}
          columns={4}
          options={[
            { value: "sticky", label: "Sticky" },
            { value: "transparent", label: "Transparent" },
            { value: "solid", label: "Solid" },
            { value: "glass", label: "Glass" },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Navigation height"
            value={tokens.header.navHeight}
            onChange={(navHeight) =>
              patch({
                header: {
                  ...tokens.header,
                  navHeight: navHeight as ThemeTokens["header"]["navHeight"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "sm", label: "Compact" },
              { value: "md", label: "Comfortable" },
              { value: "lg", label: "Tall" },
            ]}
          />
          <SelectField
            label="Logo position"
            value={tokens.header.logoPosition}
            onChange={(logoPosition) =>
              patch({
                header: {
                  ...tokens.header,
                  logoPosition:
                    logoPosition as ThemeTokens["header"]["logoPosition"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
            ]}
          />
          <SelectField
            label="Menu alignment"
            value={tokens.header.menuAlignment}
            onChange={(menuAlignment) =>
              patch({
                header: {
                  ...tokens.header,
                  menuAlignment:
                    menuAlignment as ThemeTokens["header"]["menuAlignment"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </div>
        <div className="mt-4 space-y-2">
          <ToggleField
            label="Header shadow"
            checked={tokens.header.shadow}
            onChange={(shadow) =>
              patch({ header: { ...tokens.header, shadow } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Announcement bar"
            description="Shows a top bar style in preview; content is managed in Header."
            checked={tokens.header.announcementBar}
            onChange={(announcementBar) =>
              patch({ header: { ...tokens.header, announcementBar } })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "footer") {
    return (
      <StudioSection
        title="Footer style"
        description="Layout and chrome for the site footer."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Columns"
            value={String(tokens.footer.columns)}
            onChange={(value) =>
              patch({
                footer: { ...tokens.footer, columns: Number(value) },
              })
            }
            disabled={!canManage}
            options={[
              { value: "2", label: "2 columns" },
              { value: "3", label: "3 columns" },
              { value: "4", label: "4 columns" },
            ]}
          />
          <SelectField
            label="Spacing"
            value={tokens.footer.spacing}
            onChange={(spacing) =>
              patch({
                footer: {
                  ...tokens.footer,
                  spacing: spacing as ThemeTokens["footer"]["spacing"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
          <ColorField
            label="Background override"
            value={tokens.footer.background || tokens.colors.secondary}
            onChange={(background) =>
              patch({ footer: { ...tokens.footer, background } })
            }
            disabled={!canManage}
            help="Leave synced with secondary via presets, or customize."
          />
        </div>
        <div className="mt-4 space-y-2">
          <ToggleField
            label="Newsletter"
            checked={tokens.footer.showNewsletter}
            onChange={(showNewsletter) =>
              patch({ footer: { ...tokens.footer, showNewsletter } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Social icons"
            checked={tokens.footer.showSocial}
            onChange={(showSocial) =>
              patch({ footer: { ...tokens.footer, showSocial } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Copyright"
            checked={tokens.footer.showCopyright}
            onChange={(showCopyright) =>
              patch({ footer: { ...tokens.footer, showCopyright } })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "forms") {
    return (
      <StudioSection
        title="Forms"
        description="Input, focus, and validation styling for contact and lead forms."
      >
        <ChoiceGrid
          value={tokens.forms.inputStyle}
          onChange={(inputStyle) =>
            patch({
              forms: {
                ...tokens.forms,
                inputStyle: inputStyle as ThemeTokens["forms"]["inputStyle"],
              },
            })
          }
          disabled={!canManage}
          columns={3}
          options={[
            { value: "outline", label: "Outline" },
            { value: "filled", label: "Filled" },
            { value: "underline", label: "Underline" },
          ]}
        />
        <div className="mt-4">
          <ToggleField
            label="Focus ring"
            description="Show an accessible focus ring using the accent color."
            checked={tokens.forms.focusRing}
            onChange={(focusRing) =>
              patch({ forms: { ...tokens.forms, focusRing } })
            }
            disabled={!canManage}
          />
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Success, warning, and danger colors from the color system drive
          validation states.
        </p>
      </StudioSection>
    );
  }

  if (section === "cards") {
    return (
      <StudioSection title="Cards" description="Surface treatment for content cards.">
        <ChoiceGrid
          value={tokens.cards.style}
          onChange={(style) =>
            patch({
              cards: {
                ...tokens.cards,
                style: style as ThemeTokens["cards"]["style"],
              },
            })
          }
          disabled={!canManage}
          columns={3}
          options={[
            { value: "elevated", label: "Elevated" },
            { value: "outlined", label: "Outlined" },
            { value: "flat", label: "Flat" },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Shadow"
            value={tokens.cards.shadow}
            onChange={(shadow) =>
              patch({
                cards: {
                  ...tokens.cards,
                  shadow: shadow as ThemeTokens["cards"]["shadow"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "medium", label: "Medium" },
              { value: "strong", label: "Strong" },
            ]}
          />
          <TextField
            label="Custom radius"
            value={tokens.cards.radius ?? ""}
            onChange={(radius) =>
              patch({
                cards: { ...tokens.cards, radius: radius || null },
              })
            }
            disabled={!canManage}
            placeholder="Uses card radius token"
          />
        </div>
        <div className="mt-4 space-y-2">
          <ToggleField
            label="Border"
            checked={tokens.cards.border}
            onChange={(border) =>
              patch({ cards: { ...tokens.cards, border } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Hover lift"
            checked={tokens.cards.hoverLift}
            onChange={(hoverLift) =>
              patch({ cards: { ...tokens.cards, hoverLift } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Hover scale"
            checked={tokens.cards.hoverScale}
            onChange={(hoverScale) =>
              patch({ cards: { ...tokens.cards, hoverScale } })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "sections") {
    return (
      <StudioSection
        title="Sections"
        description="Global section spacing, backgrounds, and container presets."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Section spacing"
            value={tokens.sections.spacing}
            onChange={(spacing) =>
              patch({
                sections: {
                  ...tokens.sections,
                  spacing: spacing as ThemeTokens["sections"]["spacing"],
                },
                spacing: {
                  ...tokens.spacing,
                  sectionPadding:
                    spacing as ThemeTokens["spacing"]["sectionPadding"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
              { value: "xl", label: "Extra large" },
            ]}
          />
          <SelectField
            label="Container preset"
            value={tokens.sections.containerPreset}
            onChange={(containerPreset) =>
              patch({
                sections: {
                  ...tokens.sections,
                  containerPreset:
                    containerPreset as ThemeTokens["sections"]["containerPreset"],
                },
              })
            }
            disabled={!canManage}
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "default", label: "Default" },
              { value: "wide", label: "Wide" },
              { value: "full", label: "Full bleed" },
            ]}
          />
          <ColorField
            label="Alternate background"
            value={tokens.sections.alternateBackground || tokens.colors.surface}
            onChange={(alternateBackground) =>
              patch({
                sections: { ...tokens.sections, alternateBackground },
              })
            }
            disabled={!canManage}
          />
        </div>
        <div className="mt-4">
          <ToggleField
            label="Alternating backgrounds"
            description="Odd sections can use the alternate surface color."
            checked={tokens.sections.alternatingBackgrounds}
            onChange={(alternatingBackgrounds) =>
              patch({
                sections: { ...tokens.sections, alternatingBackgrounds },
              })
            }
            disabled={!canManage}
          />
        </div>
      </StudioSection>
    );
  }

  if (section === "dark") {
    return (
      <StudioSection
        title="Dark mode"
        description="Complete dark palette with live preview and contrast validation."
      >
        <div className="space-y-2">
          <ToggleField
            label="Enable dark mode palette"
            checked={tokens.darkMode.enabled}
            onChange={(enabled) =>
              patch({ darkMode: { ...tokens.darkMode, enabled } })
            }
            disabled={!canManage}
          />
          <ToggleField
            label="Preview dark mode"
            description="Instantly switches the live preview to the dark palette."
            checked={tokens.darkMode.preview}
            onChange={(preview) =>
              patch({ darkMode: { ...tokens.darkMode, preview } })
            }
            disabled={!canManage || !tokens.darkMode.enabled}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {THEME_COLOR_KEYS.map((key) => (
            <ColorField
              key={key}
              label={`Dark ${COLOR_LABELS[key].toLowerCase()}`}
              value={tokens.darkMode.colors[key]}
              onChange={(value) =>
                patch({
                  darkMode: {
                    ...tokens.darkMode,
                    colors: { ...tokens.darkMode.colors, [key]: value },
                  },
                })
              }
              disabled={!canManage || !tokens.darkMode.enabled}
            />
          ))}
        </div>
        {failing.length > 0 && tokens.darkMode.preview ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
            Dark preview contrast issues: {failing.length}
          </div>
        ) : null}
      </StudioSection>
    );
  }

  if (section === "import") {
    return (
      <StudioSection
        title="Import / Export"
        description="Move themes between sites, duplicate for experiments, or reset to defaults."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canManage}
            onClick={onExport}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Export theme
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={onDuplicate}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Duplicate theme
          </button>
          <button
            type="button"
            disabled={!canManage}
            onClick={onReset}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Reset theme
          </button>
        </div>
        <div className="mt-4">
          <label className={authLabelClassName}>Import theme JSON</label>
          <textarea
            className={`${authInputClassName} min-h-36 font-mono text-xs`}
            value={importText}
            onChange={(event) => onImportText(event.target.value)}
            disabled={!canManage}
            placeholder='Paste a MABPS theme export ({ "format": "mabps-theme", ... })'
          />
          <button
            type="button"
            disabled={!canManage || !importText.trim()}
            onClick={onImport}
            className="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            Import theme
          </button>
        </div>
      </StudioSection>
    );
  }

  return (
    <StudioSection
      title="Advanced"
      description="Optional custom CSS for edge cases. Prefer tokens whenever possible."
    >
      <label className={authLabelClassName}>Custom CSS</label>
      <textarea
        className={`${authInputClassName} min-h-40 font-mono text-xs`}
        value={customCss ?? ""}
        onChange={(event) => onCustomCss(event.target.value || null)}
        disabled={!canManage}
        placeholder="/* Optional overrides */"
      />
    </StudioSection>
  );
}
