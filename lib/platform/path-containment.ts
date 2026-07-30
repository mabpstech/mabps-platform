/**
 * Single validated filesystem path resolver for knowledge (and similar) storage.
 *
 * Always canonicalize + contain under a configured root. Never trust user-supplied
 * paths. Optional workspaceId enforces tenant subdirectory isolation.
 *
 * Keep algorithm in sync with `scripts/lib/path-containment.mjs`.
 */

import fs from "node:fs";
import path from "node:path";

export class PathEscapeError extends Error {
  constructor(message = "Invalid storage path.") {
    super(message);
    this.name = "PathEscapeError";
  }
}

/** Reject path segments that could escape a directory join. */
export function assertSafePathSegment(
  segment: string,
  label = "path segment",
): void {
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

/**
 * Decode URI escapes repeatedly so `%2e%2e` / `%252e` cannot bypass checks.
 * Storage keys from this app are plain relative paths; encoded input is hostile.
 */
export function decodePathInput(raw: string): string {
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

function normalizeSeparators(input: string): string {
  return input.replace(/\\/g, "/");
}

/** True when `absolute` is exactly `root` or a path under it (after resolve). */
export function isPathInsideRoot(absolute: string, root: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedAbsolute = path.resolve(absolute);
  if (resolvedAbsolute === resolvedRoot) return true;
  const prefix = resolvedRoot.endsWith(path.sep)
    ? resolvedRoot
    : resolvedRoot + path.sep;
  return resolvedAbsolute.startsWith(prefix);
}

function realpathIfExists(target: string): string | null {
  try {
    return fs.realpathSync(target);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export type ResolveContainedPathInput = {
  /** Absolute knowledge/uploads root that must contain the result. */
  root: string;
  /** Relative (preferred) or absolute storage path from DB / caller. */
  storagePath: string;
  /** When set, result must also lie under `root/workspaceId`. */
  workspaceId?: string;
  /** Override process.cwd() (tests). */
  cwd?: string;
};

/**
 * Canonicalize `storagePath` and ensure it cannot escape `root`
 * (and optional workspace subdirectory). Uses realpath when the path or its
 * nearest existing ancestor exists so symlink escapes are rejected.
 */
export function resolveContainedPath(input: ResolveContainedPathInput): string {
  const cwd = input.cwd ?? /* turbopackIgnore: true */ process.cwd();
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

  // Path does not exist yet (writes / deletes of missing files):
  // realpath the nearest existing ancestor and re-check the joined candidate.
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

  // No existing ancestor (brand-new tree under root) — lexical check already passed.
  return absolute;
}
