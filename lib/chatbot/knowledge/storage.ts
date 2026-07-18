import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

function uploadsRoot(): string {
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "uploads",
    "chatbot",
  );
}

export function knowledgeUploadDir(
  workspaceId: string,
  botId: string,
): string {
  return path.join(uploadsRoot(), workspaceId, botId);
}

export function ensureKnowledgeUploadDir(
  workspaceId: string,
  botId: string,
): string {
  const dir = knowledgeUploadDir(workspaceId, botId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
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
  fs.writeFileSync(absolutePath, input.bytes);
  const storagePath = path.relative(
    /* turbopackIgnore: true */ process.cwd(),
    absolutePath,
  );
  return { storagePath, absolutePath, fileName };
}

export function readKnowledgeFile(storagePath: string): Buffer {
  const absolute = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), storagePath);
  return fs.readFileSync(absolute);
}

export function removeKnowledgeFile(storagePath: string | null | undefined) {
  if (!storagePath) return;
  const absolute = path.isAbsolute(storagePath)
    ? storagePath
    : path.join(/* turbopackIgnore: true */ process.cwd(), storagePath);
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}
