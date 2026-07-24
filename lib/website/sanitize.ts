import { sanitize as domPurifySanitize } from "isomorphic-dompurify";

/**
 * Stored XSS controls for public website surfaces:
 * rich HTML, custom CSS, and JSON-LD.
 *
 * HTML uses DOMPurify (via isomorphic-dompurify). Unsafe tags and inline
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

/** CSS that can break out of <style>, run JS, or load untrusted sheets. */
const UNSAFE_CSS_PATTERN =
  /@import\b|expression\s*\(|(?:javascript|vbscript)\s*:|behavior\s*:|-moz-binding\b|data\s*:\s*text\/html|<\/?\s*(?:style|script|iframe|link|object|embed|svg)\b|\\\s*0*3c/i;

export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  return domPurifySanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [...FORBIDDEN_HTML_TAGS],
    FORBID_ATTR: ["style", "srcdoc"],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
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
