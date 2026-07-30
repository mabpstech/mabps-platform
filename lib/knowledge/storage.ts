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

/** Absolute root for workspace knowledge uploads. */
export function knowledgeUploadsRoot(): string {
  return path.join(cwdRoot(), "data", "uploads", "knowledge");
}

export function knowledgeUploadDir(workspaceId: string): string {
  assertSafePathSegment(workspaceId, "workspace id");
  return path.join(knowledgeUploadsRoot(), workspaceId);
}

export function ensureKnowledgeUploadDir(workspaceId: string): string {
  const dir = knowledgeUploadDir(workspaceId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function resolveKnowledgeAbsolute(
  storagePath: string,
  workspaceId?: string,
): string {
  return resolveContainedPath({
    root: knowledgeUploadsRoot(),
    storagePath,
    workspaceId,
    cwd: cwdRoot(),
  });
}

export function saveKnowledgeFile(input: {
  workspaceId: string;
  originalName: string;
  bytes: Buffer;
}): { storagePath: string; absolutePath: string; fileName: string } {
  const dir = ensureKnowledgeUploadDir(input.workspaceId);
  const ext = path.extname(input.originalName).toLowerCase().slice(0, 12);
  const fileName = `${randomUUID()}${ext}`;
  const absolutePath = path.join(dir, fileName);
  // Contain write target (defensive — path is built from safe segments + UUID).
  const contained = resolveKnowledgeAbsolute(
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
  const absolute = resolveKnowledgeAbsolute(storagePath, workspaceId);
  return fs.readFileSync(absolute);
}

export function removeKnowledgeFile(
  storagePath: string | null | undefined,
  workspaceId?: string,
) {
  if (!storagePath) return;
  const absolute = resolveKnowledgeAbsolute(storagePath, workspaceId);
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}

export { resolveKnowledgeAbsolute };
