/**
 * URL safety helpers for redirects and outbound fetches (SSRF / open redirect).
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = (value << 8) | n;
  }
  return value >>> 0;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value == null) return true;
  // 0.0.0.0/8, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 224+/4 (multicast+)
  if (value <= 0x00ffffff) return true;
  if ((value & 0xff000000) === 0x0a000000) return true;
  if ((value & 0xff000000) === 0x7f000000) return true;
  if ((value & 0xffff0000) === 0xa9fe0000) return true;
  if ((value & 0xfff00000) === 0xac100000) return true;
  if ((value & 0xffff0000) === 0xc0a80000) return true;
  if ((value & 0xf0000000) >= 0xe0000000) return true;
  return false;
}

function isPrivateOrReservedIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("::ffff:")) {
    const mapped = h.slice("::ffff:".length);
    if (mapped.includes(".")) return isPrivateOrReservedIpv4(mapped);
  }
  return false;
}

export function isBlockedFetchHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return isPrivateOrReservedIpv4(host);
  }
  if (host.includes(":")) {
    return isPrivateOrReservedIpv6(host);
  }
  return false;
}

/**
 * Validate an absolute http(s) URL is safe for server-side fetch (SSRF guard).
 * Does not follow redirects — callers must re-check `response.url` after fetch.
 */
export function assertSafeOutboundUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new Error("URL credentials are not allowed.");
  }
  if (isBlockedFetchHostname(url.hostname)) {
    throw new Error("URL targets a private or reserved host.");
  }
  return url;
}

/**
 * Safe redirect target for email click tracking.
 * Only absolute http(s) URLs to public hosts; otherwise fall back.
 */
export function sanitizeRedirectUrl(
  raw: string | null | undefined,
  fallback = "/",
): string {
  const value = (raw || "").trim();
  if (!value) return fallback;

  // Relative same-site paths only (no protocol-relative).
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const url = assertSafeOutboundUrl(value);
    return url.toString();
  } catch {
    return fallback;
  }
}

/**
 * Fetch with redirect:manual so each hop can be SSRF-checked.
 */
export async function fetchPublicUrl(
  raw: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = init;
  let current = assertSafeOutboundUrl(raw).toString();
  const maxRedirects = 5;

  for (let i = 0; i <= maxRedirects; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        ...rest,
        redirect: "manual",
        signal: rest.signal ?? controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect missing Location header.");
        }
        const next = new URL(location, current).toString();
        assertSafeOutboundUrl(next);
        current = next;
        continue;
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Too many redirects.");
}
