import {
  DEFAULT_CRAWL_CONFIG,
  MAX_CRAWL_CHARS,
} from "@/lib/knowledge/defaults";
import { extractHtmlText } from "@/lib/knowledge/extract";
import type { KbCrawlConfig } from "@/lib/knowledge/types";
import {
  assertSafeOutboundUrl,
  fetchPublicUrl,
} from "@/lib/platform/safe-url";

export type CrawledPage = {
  url: string;
  title: string;
  text: string;
  depth: number;
};

function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    if (url.pathname.endsWith("/") && url.pathname.length > 1) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, pageUrl: string): string[] {
  const hrefs: string[] = [];
  const regex = /<a\b[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const normalized = normalizeUrl(match[1], pageUrl);
    if (normalized) hrefs.push(normalized);
  }
  return hrefs;
}

function extractTitle(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return fallback;
  return match[1].replace(/\s+/g, " ").trim() || fallback;
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetchPublicUrl(url, {
    headers: {
      "User-Agent": "MABPS-KnowledgeCrawler/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain",
    },
    timeoutMs: 15_000,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status}).`);
  }
  // Re-validate final URL in case of edge cases / absolute Location quirks.
  assertSafeOutboundUrl(response.url || url);
  const contentType = response.headers.get("content-type") || "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("text/plain") &&
    !contentType.includes("application/xhtml")
  ) {
    throw new Error(`Unsupported content type for ${url}: ${contentType}`);
  }
  return { html: await response.text(), finalUrl: response.url || url };
}

export async function crawlWebsite(
  startUrl: string,
  config: KbCrawlConfig = {},
): Promise<{ pages: CrawledPage[]; combinedText: string }> {
  const maxPages = config.maxPages ?? DEFAULT_CRAWL_CONFIG.maxPages;
  const maxDepth = config.maxDepth ?? DEFAULT_CRAWL_CONFIG.maxDepth;
  const sameOriginOnly =
    config.sameOriginOnly ?? DEFAULT_CRAWL_CONFIG.sameOriginOnly;

  const seed = normalizeUrl(startUrl);
  if (!seed) throw new Error("Invalid website URL.");
  if (!/^https?:\/\//i.test(seed)) {
    throw new Error("Website URL must start with http:// or https://.");
  }
  assertSafeOutboundUrl(seed);

  const origin = new URL(seed).origin;
  const queue: Array<{ url: string; depth: number }> = [{ url: seed, depth: 0 }];
  const seen = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: string[] = [];

  while (queue.length && pages.length < maxPages) {
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);

    try {
      const { html, finalUrl } = await fetchPage(next.url);
      const contentTypeHint = html.slice(0, 200).toLowerCase();
      const isPlain =
        !contentTypeHint.includes("<html") &&
        !contentTypeHint.includes("<!doctype");
      const text = isPlain
        ? html.trim()
        : extractHtmlText(html);
      if (text.length < 20) {
        errors.push(`${next.url}: not enough extractable text`);
        continue;
      }

      pages.push({
        url: finalUrl,
        title: isPlain ? finalUrl : extractTitle(html, finalUrl),
        text: text.slice(0, 80_000),
        depth: next.depth,
      });

      if (next.depth < maxDepth) {
        for (const link of extractLinks(html, finalUrl)) {
          if (seen.has(link)) continue;
          if (sameOriginOnly && new URL(link).origin !== origin) continue;
          try {
            assertSafeOutboundUrl(link);
          } catch {
            continue;
          }
          queue.push({ url: link, depth: next.depth + 1 });
        }
      }
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : `Failed to crawl ${next.url}`,
      );
    }
  }

  if (!pages.length) {
    throw new Error(
      errors[0] || "Website crawl did not return any extractable pages.",
    );
  }

  const combinedText = pages
    .map((page) => `## ${page.title}\nURL: ${page.url}\n\n${page.text}`)
    .join("\n\n---\n\n")
    .slice(0, MAX_CRAWL_CHARS);

  return { pages, combinedText };
}
