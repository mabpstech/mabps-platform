import type { KbCrawlConfig } from "@/lib/knowledge/types";

export const DEFAULT_CHUNK_SIZE = 900;
export const DEFAULT_CHUNK_OVERLAP = 120;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_CRAWL_CHARS = 400_000;

export const DEFAULT_CRAWL_CONFIG: Required<KbCrawlConfig> = {
  maxPages: 8,
  maxDepth: 1,
  sameOriginOnly: true,
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  markdown: "Markdown",
  website: "Website",
};
