/**
 * Path containment — Node script mirror.
 * Keep algorithm in sync with `lib/platform/path-containment.ts`.
 */

import fs from "node:fs";
import path from "node:path";

export class PathEscapeError extends Error {
  constructor(message = "Invalid storage path.") {
    super(message);
    this.name = "PathEscapeError";
  }
}

export function assertSafePathSegment(segment, label = "path segment") {
  if (typeof segment !== "string" || !segment) {
    throw new PathEscapeError(`Invalid ${label}.`);
  }
  if (
    segment.includes("\0") ||
    segment === "." ||
    segment === ".." ||
    segment.includes("/") ||
    segment.includes("\\") ||
    segment.includes("%")
  ) {
    throw new PathEscapeError(`Invalid ${label}.`);
  }
}

export function decodePathInput(raw) {
  if (typeof raw !== "string" || !raw) {
    throw new PathEscapeError();
  }
  if (raw.includes("\0")) {
    throw new PathEscapeError();
  }

  let current = raw;
  for (let i = 0; i < 8; i++) {
    if (!/%[0-9a-fA-F]{2}/.test(current)) break;
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      throw new PathEscapeError("Invalid storage path encoding.");
    }
  }

  if (current.includes("\0")) {
    throw new PathEscapeError();
  }
  return current;
}

function normalizeSeparators(input) {
  return input.replace(/\\/g, "/");
}

export function isPathInsideRoot(absolute, root) {
  const resolvedRoot = path.resolve(root);
  const resolvedAbsolute = path.resolve(absolute);
  if (resolvedAbsolute === resolvedRoot) return true;
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;
  return resolvedAbsolute.startsWith(prefix);
}

function realpathIfExists(target) {
  try {
    return fs.realpathSync(target);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function resolveContainedPath(input) {
  const cwd = input.cwd ?? process.cwd();
  const decoded = decodePathInput(input.storagePath);
  const normalized = normalizeSeparators(decoded);

  const resolvedRoot = path.resolve(input.root);
  let containmentRoot = resolvedRoot;

  if (input.workspaceId !== undefined) {
    assertSafePathSegment(input.workspaceId, "workspace id");
    containmentRoot = path.resolve(resolvedRoot, input.workspaceId);
  }

  const absolute = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(cwd, normalized);

  if (!isPathInsideRoot(absolute, containmentRoot)) {
    throw new PathEscapeError();
  }

  const realRoot = realpathIfExists(containmentRoot) ?? containmentRoot;
  const realAbsolute = realpathIfExists(absolute);
  if (realAbsolute) {
    if (!isPathInsideRoot(realAbsolute, realRoot)) {
      throw new PathEscapeError();
    }
    return realAbsolute;
  }

  let ancestor = path.dirname(absolute);
  let suffix = path.basename(absolute);
  for (let i = 0; i < 64; i++) {
    const realAncestor = realpathIfExists(ancestor);
    if (realAncestor) {
      const candidate = path.resolve(realAncestor, suffix);
      if (!isPathInsideRoot(candidate, realRoot)) {
        throw new PathEscapeError();
      }
      return absolute;
    }
    if (ancestor === path.dirname(ancestor)) break;
    suffix = path.join(path.basename(ancestor), suffix);
    ancestor = path.dirname(ancestor);
  }

  return absolute;
}
