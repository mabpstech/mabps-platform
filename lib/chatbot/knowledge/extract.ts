import { inflateRawSync } from "node:zlib";
import { readKnowledgeFile } from "@/lib/chatbot/knowledge/storage";
import type { KnowledgeSourceType } from "@/lib/chatbot/types";
import {
  assertSafeOutboundUrl,
  fetchPublicUrl,
} from "@/lib/platform/safe-url";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const pieces: string[] = [];
  const regex = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw))) {
    const block = match[1];
    const partRegex = /\((?:\\.|[^\\)])*\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g;
    let part: RegExpExecArray | null;
    while ((part = partRegex.exec(block))) {
      if (part[0].endsWith("Tj")) {
        const inner = part[0].slice(1, part[0].lastIndexOf(")"));
        pieces.push(
          inner
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "")
            .replace(/\\t/g, " ")
            .replace(/\\\(/g, "(")
            .replace(/\\\)/g, ")")
            .replace(/\\\\/g, "\\"),
        );
      } else if (part[1]) {
        const strings = part[1].match(/\((?:\\.|[^\\)])*\)/g) || [];
        for (const s of strings) {
          pieces.push(s.slice(1, -1));
        }
      }
    }
  }
  const text = pieces.join(" ").replace(/\s+/g, " ").trim();
  if (text.length < 20) {
    throw new Error(
      "Could not extract enough text from this PDF. Try a text-based PDF or TXT export.",
    );
  }
  return text;
}

function extractDocxText(buffer: Buffer): string {
  let offset = 0;
  while (offset + 30 < buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const compression = buffer.readUInt16LE(offset + 8);
    const compSize = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const name = buffer
      .slice(offset + 30, offset + 30 + nameLen)
      .toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (name === "word/document.xml") {
      const compressed = buffer.slice(dataStart, dataEnd);
      let xml: string;
      if (compression === 0) {
        xml = compressed.toString("utf8");
      } else if (compression === 8) {
        xml = inflateRawSync(compressed).toString("utf8");
      } else {
        throw new Error("Unsupported DOCX compression.");
      }
      const text = xml
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:br[^/]*\/>/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (!text) throw new Error("DOCX document was empty.");
      return text;
    }
    if (compSize === 0 && nameLen === 0) break;
    offset = dataEnd;
  }
  throw new Error("Could not find word/document.xml in DOCX upload.");
}

async function extractWebsiteText(url: string): Promise<string> {
  assertSafeOutboundUrl(url);
  const response = await fetchPublicUrl(url, {
    headers: {
      "User-Agent": "MABPS-ChatbotKnowledgeBot/1.0",
      Accept: "text/html,application/xhtml+xml,text/plain",
    },
    timeoutMs: 15_000,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status}).`);
  }
  assertSafeOutboundUrl(response.url || url);
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  if (contentType.includes("text/plain")) {
    return body.trim();
  }
  const text = stripHtml(body);
  if (text.length < 20) {
    throw new Error("Website page did not contain enough extractable text.");
  }
  return text.slice(0, 200_000);
}

export async function extractKnowledgeText(input: {
  type: KnowledgeSourceType;
  storagePath?: string | null;
  sourceUrl?: string | null;
  workspaceId?: string;
}): Promise<string> {
  if (input.type === "website") {
    if (!input.sourceUrl) throw new Error("Website URL is required.");
    return extractWebsiteText(input.sourceUrl);
  }

  if (!input.storagePath) {
    throw new Error("Uploaded file is missing.");
  }

  const buffer = readKnowledgeFile(input.storagePath, input.workspaceId);
  if (input.type === "txt") {
    return buffer.toString("utf8").trim();
  }
  if (input.type === "pdf") {
    return extractPdfText(buffer);
  }
  if (input.type === "docx") {
    return extractDocxText(buffer);
  }
  throw new Error(`Unsupported knowledge source type: ${input.type}`);
}
