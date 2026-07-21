"use client";

import {
  cssVarsToInlineStyle,
  readableOn,
  shadowCss,
  themeTokensToCssVars,
} from "@/lib/website/theme";
import type { ThemeTokens } from "@/lib/website/theme/types";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export function ThemePreview({
  tokens,
  device,
  onDeviceChange,
  siteName,
}: {
  tokens: ThemeTokens;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  siteName?: string;
}) {
  const vars = themeTokensToCssVars(tokens);
  const style = cssVarsToInlineStyle(vars) as React.CSSProperties;
  const brandName = tokens.brand.businessName || siteName || "Your brand";
  const buttonRadius =
    tokens.buttons.shape === "pill"
      ? "9999px"
      : tokens.buttons.shape === "square"
        ? "0px"
        : tokens.borders.buttonRadius;
  const primaryFg = readableOn(tokens.colors.primary);
  const cardShadow = shadowCss(tokens.cards.shadow);
  const buttonShadow = shadowCss(tokens.buttons.shadow);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Live preview
        </p>
        <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
          {(
            [
              ["desktop", "Desktop"],
              ["tablet", "Tablet"],
              ["mobile", "Mobile"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onDeviceChange(id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                device === id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 justify-center overflow-auto rounded-2xl border border-zinc-200 bg-zinc-100/80 p-4">
        <div
          className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm transition-all duration-300"
          style={{
            width: DEVICE_WIDTH[device],
            maxWidth: "100%",
            ...style,
            background: "var(--site-color-background)",
            color: "var(--site-color-text)",
            fontFamily: "var(--site-font-body)",
          }}
        >
          {tokens.header.announcementBar ? (
            <div
              className="px-3 py-1.5 text-center text-[10px] font-medium"
              style={{
                background: "var(--site-color-primary)",
                color: primaryFg,
              }}
            >
              Free shipping on orders over $50
            </div>
          ) : null}

          <header
            className="flex items-center justify-between gap-3 border-b px-4"
            style={{
              borderColor: "var(--site-color-border)",
              background:
                tokens.header.style === "glass"
                  ? "color-mix(in srgb, var(--site-color-surface) 80%, transparent)"
                  : tokens.header.style === "transparent"
                    ? "transparent"
                    : "var(--site-color-surface)",
              boxShadow: tokens.header.shadow
                ? "var(--site-shadow-nav)"
                : "none",
              minHeight:
                tokens.header.navHeight === "sm"
                  ? "2.75rem"
                  : tokens.header.navHeight === "lg"
                    ? "4rem"
                    : "3.25rem",
              backdropFilter:
                tokens.header.style === "glass" ? "blur(10px)" : undefined,
            }}
          >
            <div
              className={`flex flex-1 items-center ${
                tokens.header.logoPosition === "center"
                  ? "justify-center"
                  : "justify-start"
              }`}
            >
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--site-font-heading)",
                  fontWeight: "var(--site-font-heading-weight)" as unknown as number,
                }}
              >
                {brandName}
              </span>
            </div>
            {device !== "mobile" ? (
              <nav
                className="hidden items-center gap-3 text-[11px] sm:flex"
                style={{
                  fontFamily: "var(--site-font-nav)",
                  color: "var(--site-color-text-secondary)",
                }}
              >
                <span>Home</span>
                <span>Products</span>
                <span>About</span>
              </nav>
            ) : null}
          </header>

          <div
            className="px-5"
            style={{
              paddingTop: "var(--site-section-padding)",
              paddingBottom: "calc(var(--site-section-padding) * 0.65)",
            }}
          >
            <div
              className="mx-auto"
              style={{ maxWidth: "var(--site-container-width)" }}
            >
              {tokens.brand.slogan ? (
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.16em]"
                  style={{ color: "var(--site-color-muted)" }}
                >
                  {tokens.brand.slogan}
                </p>
              ) : null}
              <h3
                className="mt-2 font-semibold tracking-tight"
                style={{
                  fontFamily: "var(--site-font-heading)",
                  fontSize: "var(--site-font-size-h1)",
                  fontWeight: "var(--site-font-heading-weight)" as unknown as number,
                  letterSpacing: "var(--site-letter-spacing)",
                  color: "var(--site-color-text)",
                }}
              >
                Design that feels premium
              </h3>
              <p
                className="mt-3 text-sm"
                style={{
                  color: "var(--site-color-muted)",
                  lineHeight: "var(--site-line-height)",
                  maxWidth: "var(--site-paragraph-width)",
                  fontSize: "var(--site-font-size-body)",
                }}
              >
                Every color, typeface, and radius updates this preview instantly —
                no CSS required.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {(
                  [
                    ["primary", "Primary"],
                    ["secondary", "Secondary"],
                    ["outline", "Outline"],
                    ["ghost", "Ghost"],
                  ] as const
                ).map(([variant, label]) => (
                  <button
                    key={variant}
                    type="button"
                    className="px-3.5 py-2 text-xs font-medium transition"
                    style={{
                      fontFamily: "var(--site-font-button)",
                      borderRadius: buttonRadius,
                      boxShadow: buttonShadow,
                      background:
                        variant === "primary"
                          ? "var(--site-color-primary)"
                          : variant === "secondary"
                            ? "var(--site-color-secondary)"
                            : "transparent",
                      color:
                        variant === "outline" || variant === "ghost"
                          ? "var(--site-color-primary)"
                          : primaryFg,
                      border:
                        variant === "outline"
                          ? "1px solid var(--site-color-primary)"
                          : variant === "ghost"
                            ? "1px solid transparent"
                            : "1px solid transparent",
                      opacity: tokens.buttons.defaultVariant === variant ? 1 : 0.85,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div
                className="mt-6 grid gap-3"
                style={{
                  gridTemplateColumns:
                    device === "mobile" ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: "var(--site-grid-gap)",
                }}
              >
                {[0, 1].map((index) => (
                  <div
                    key={index}
                    className="transition"
                    style={{
                      background: "var(--site-color-surface)",
                      borderRadius: "var(--site-radius-card)",
                      padding: "var(--site-card-padding)",
                      border: tokens.cards.border
                        ? "1px solid var(--site-color-border)"
                        : "1px solid transparent",
                      boxShadow: cardShadow,
                      transform:
                        tokens.cards.hoverLift && index === 0
                          ? "translateY(-2px)"
                          : undefined,
                    }}
                  >
                    <div
                      className="mb-3 aspect-[16/10] w-full"
                      style={{
                        background:
                          index === 0
                            ? "linear-gradient(135deg, var(--site-color-primary), var(--site-color-accent))"
                            : "linear-gradient(135deg, var(--site-color-secondary), var(--site-color-muted))",
                        borderRadius: "var(--site-radius-image)",
                      }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ fontFamily: "var(--site-font-heading)" }}
                    >
                      {index === 0 ? "Featured card" : "Surface card"}
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--site-color-muted)" }}
                    >
                      Cards inherit radius, shadow, and spacing tokens.
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3" style={{ maxWidth: "20rem" }}>
                <label className="block text-[11px] font-medium">
                  Email
                  <input
                    className="mt-1 w-full px-3 py-2 text-sm outline-none"
                    placeholder="you@business.com"
                    style={{
                      borderRadius: "var(--site-radius-input)",
                      border:
                        tokens.forms.inputStyle === "underline"
                          ? "none"
                          : "1px solid var(--site-color-border)",
                      borderBottom:
                        tokens.forms.inputStyle === "underline"
                          ? "1px solid var(--site-color-border)"
                          : undefined,
                      background:
                        tokens.forms.inputStyle === "filled"
                          ? "var(--site-color-surface)"
                          : "transparent",
                      boxShadow: tokens.forms.focusRing
                        ? "0 0 0 2px color-mix(in srgb, var(--site-color-accent) 25%, transparent)"
                        : undefined,
                    }}
                    readOnly
                  />
                </label>
                <div className="flex gap-2 text-[11px]">
                  <span style={{ color: "var(--site-color-success)" }}>Success</span>
                  <span style={{ color: "var(--site-color-warning)" }}>Warning</span>
                  <span style={{ color: "var(--site-color-danger)" }}>Danger</span>
                </div>
              </div>
            </div>
          </div>

          <footer
            className="mt-2 border-t px-5 py-5 text-[11px]"
            style={{
              background:
                tokens.footer.background || "var(--site-color-secondary)",
              color: readableOn(
                tokens.footer.background || tokens.colors.secondary,
              ),
              boxShadow: "var(--site-shadow-footer)",
            }}
          >
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(tokens.footer.columns, device === "mobile" ? 2 : 4)}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: Math.min(tokens.footer.columns, 4) }).map(
                (_, index) => (
                  <div key={index}>
                    <p className="font-semibold opacity-90">Column {index + 1}</p>
                    <p className="mt-1 opacity-70">Link · Link</p>
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 opacity-80">
              {tokens.footer.showCopyright ? (
                <p>© {new Date().getFullYear()} {brandName}</p>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {tokens.footer.showSocial ? <span>Social</span> : null}
                {tokens.footer.showNewsletter ? <span>Newsletter</span> : null}
              </div>
            </div>
          </footer>
        </div>
      </div>

      {tokens.darkMode.preview ? (
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Dark mode preview is on — toggle it off in Dark mode settings.
        </p>
      ) : null}
    </div>
  );
}
