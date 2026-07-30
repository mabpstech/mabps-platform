import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  assertSafePathSegment,
  resolveContainedPath,
} from "@/lib/platform/path-containment";

function cwdRoot(): string {
  return /* turbopackIgnore: true */ process.cwd();
}

/** Absolute root for chatbot knowledge uploads. */
export function chatbotKnowledgeUploadsRoot(): string {
  return path.join(cwdRoot(), "data", "uploads", "chatbot");
}

export function knowledgeUploadDir(
  workspaceId: string,
  botId: string,
): string {
  assertSafePathSegment(workspaceId, "workspace id");
  assertSafePathSegment(botId, "bot id");
  return path.join(chatbotKnowledgeUploadsRoot(), workspaceId, botId);
}

export function ensureKnowledgeUploadDir(
  workspaceId: string,
  botId: string,
): string {
  const dir = knowledgeUploadDir(workspaceId, botId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveChatbotKnowledgeAbsolute(
  storagePath: string,
  workspaceId?: string,
): string {
  return resolveContainedPath({
    root: chatbotKnowledgeUploadsRoot(),
    storagePath,
    workspaceId,
    cwd: cwdRoot(),
  });
}

export function saveKnowledgeFile(input: {
  workspaceId: string;
  botId: string;
  originalName: string;
  bytes: Buffer;
}): { storagePath: string; absolutePath: string; fileName: string } {
  const dir = ensureKnowledgeUploadDir(input.workspaceId, input.botId);
  const ext = path.extname(input.originalName).toLowerCase().slice(0, 12);
  const fileName = `${randomUUID()}${ext}`;
  const absolutePath = path.join(dir, fileName);
  const contained = resolveChatbotKnowledgeAbsolute(
    path.relative(cwdRoot(), absolutePath),
    input.workspaceId,
  );
  fs.writeFileSync(contained, input.bytes);
  const storagePath = path.relative(cwdRoot(), contained);
  return { storagePath, absolutePath: contained, fileName };
}

export function readKnowledgeFile(
  storagePath: string,
  workspaceId?: string,
): Buffer {
  const absolute = resolveChatbotKnowledgeAbsolute(storagePath, workspaceId);
  return fs.readFileSync(absolute);
}

export function removeKnowledgeFile(
  storagePath: string | null | undefined,
  workspaceId?: string,
) {
  if (!storagePath) return;
  const absolute = resolveChatbotKnowledgeAbsolute(storagePath, workspaceId);
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}

export { resolveChatbotKnowledgeAbsolute };
