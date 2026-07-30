import sanitizeHtml from "sanitize-html";

/**
 * Stored XSS controls for public website surfaces:
 * rich HTML, custom CSS, and JSON-LD.
 *
 * HTML uses sanitize-html (Node/CJS-safe; no jsdom). Unsafe tags and inline
 * JavaScript handlers are rejected/stripped. CSS and JSON-LD use strict
 * structural checks plus safe serialization.
 */

const FORBIDDEN_HTML_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "link",
  "meta",
  "base",
  "applet",
  "frame",
  "frameset",
  "noscript",
  "svg",
  "math",
  "template",
  "style",
] as const;

const FORBIDDEN_HTML_TAG_SET = new Set<string>(FORBIDDEN_HTML_TAGS);

/**
 * Allowlist aligned with DOMPurify's HTML profile minus FORBIDDEN_HTML_TAGS.
 * Media tags that the previous profile kept (img/video/…) stay allowed so
 * stored rich HTML does not change visually.
 */
const ALLOWED_HTML_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
  "del",
  "ins",
  "details",
  "summary",
  "center",
  "font",
  "map",
  "area",
].filter((tag) => !FORBIDDEN_HTML_TAG_SET.has(tag));

const RICH_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_HTML_TAGS,
  // Match prior FORBID_ATTR (style, srcdoc) and ALLOW_DATA_ATTR: false.
  // Event handlers are never allowlisted, so onclick/onerror/etc. are stripped.
  allowedAttributes: {
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "srcset", "sizes", "alt", "title", "width", "height", "loading"],
    source: ["src", "srcset", "sizes", "type", "media"],
    video: ["src", "controls", "width", "height", "poster", "preload"],
    audio: ["src", "controls", "preload"],
    track: ["src", "kind", "srclang", "label", "default"],
    area: ["alt", "coords", "href", "shape", "target", "rel"],
    td: ["colspan", "rowspan", "headers"],
    th: ["colspan", "rowspan", "headers", "scope"],
    col: ["span"],
    colgroup: ["span"],
    ol: ["start", "type"],
    ul: ["type"],
    "*": ["class", "id", "title", "lang", "dir", "role", "aria-*"],
  },
  // Match ALLOW_UNKNOWN_PROTOCOLS: false (safe schemes only).
  allowedSchemes: ["http", "https", "ftp", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: [
    "href",
    "src",
    "cite",
    "poster",
    "action",
    "formaction",
  ],
  allowProtocolRelative: false,
  parseStyleAttributes: false,
  // Keep text inside stripped wrappers (e.g. <form><p>hi</p></form> → <p>hi</p>),
  // while discarding contents of inherently executable tags (script/style/…).
  disallowedTagsMode: "discard",
};

/** CSS that can break out of <style>, run JS, or load untrusted sheets. */
const UNSAFE_CSS_PATTERN =
  /@import\b|expression\s*\(|(?:javascript|vbscript)\s*:|behavior\s*:|-moz-binding\b|data\s*:\s*text\/html|<\/?\s*(?:style|script|iframe|link|object|embed|svg)\b|\\\s*0*3c/i;

export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, RICH_HTML_OPTIONS);
}

export function containsUnsafeCss(css: string): boolean {
  return UNSAFE_CSS_PATTERN.test(css);
}

/**
 * Sanitize custom CSS for safe embedding in a <style> tag.
 * Returns empty string when input is empty or unsafe (render fail-closed).
 */
export function sanitizeCustomCss(css: string): string {
  if (!css.trim()) return "";
  if (containsUnsafeCss(css)) return "";
  // Defense in depth: neutralize style-close sequences if any slip through.
  return css.replace(/<\/style/gi, "<\\/style");
}

/** Write-path: reject unsafe custom CSS instead of silently storing it. */
export function requireSafeCustomCss(css: string): string {
  if (containsUnsafeCss(css)) {
    throw new Error(
      "Custom CSS contains unsafe constructs or inline JavaScript.",
    );
  }
  return sanitizeCustomCss(css);
}

/**
 * Parse and re-serialize JSON-LD, escaping `<` so `</script>` cannot break
 * out of an application/ld+json script tag. Returns null when invalid.
 */
export function sanitizeJsonLd(jsonLd: string): string | null {
  const trimmed = jsonLd.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    return JSON.stringify(parsed).replace(/</g, "\\u003c");
  } catch {
    return null;
  }
}

/** Write-path: reject invalid or unsafe JSON-LD. */
export function requireSafeJsonLd(jsonLd: string): string {
  const sanitized = sanitizeJsonLd(jsonLd);
  if (sanitized === null) {
    throw new Error(
      "JSON-LD must be valid JSON (object or array) without unsafe script content.",
    );
  }
  return sanitized;
}

/** Sanitize section payloads before persistence (rich text HTML). */
export function sanitizeSectionContent(
  type: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  if (type === "richText" && typeof content.html === "string") {
    return { ...content, html: sanitizeRichHtml(content.html) };
  }
  return content;
}
