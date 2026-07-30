#!/usr/bin/env node
/**
 * Security tests for knowledge path containment.
 * Source of truth: lib/platform/path-containment.ts
 * Mirror: scripts/lib/path-containment.mjs
 *
 * Run: node ./scripts/test-knowledge-path-containment.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PathEscapeError,
  assertSafePathSegment,
  resolveContainedPath,
} from "./lib/path-containment.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mabps-kb-path-"));
const cwd = tmp;
const root = path.join(cwd, "data", "uploads", "knowledge");
const wsA = "workspace-a";
const wsB = "workspace-b";
const dirA = path.join(root, wsA);
const dirB = path.join(root, wsB);

fs.mkdirSync(dirA, { recursive: true });
fs.mkdirSync(dirB, { recursive: true });
fs.writeFileSync(path.join(dirA, "doc.txt"), "tenant-a");
fs.writeFileSync(path.join(dirB, "doc.txt"), "tenant-b");
fs.writeFileSync(path.join(cwd, "secret.txt"), "outside-root");

function resolve(storagePath, workspaceId) {
  return resolveContainedPath({
    root,
    storagePath,
    workspaceId,
    cwd,
  });
}

function assertRejects(storagePath, workspaceId, label) {
  assert.throws(
    () => resolve(storagePath, workspaceId),
    (err) => err instanceof PathEscapeError,
    label || storagePath,
  );
}

// Happy path + tenant isolation
{
  const ok = resolve(`data/uploads/knowledge/${wsA}/doc.txt`, wsA);
  assert.equal(fs.readFileSync(ok, "utf8"), "tenant-a");
}

// Cross-tenant access must fail when workspaceId is enforced
assertRejects(`data/uploads/knowledge/${wsB}/doc.txt`, wsA, "cross-tenant");

// ../ traversal
assertRejects(
  `data/uploads/knowledge/${wsA}/../../../secret.txt`,
  wsA,
  "../ traversal",
);
assertRejects(
  `data/uploads/knowledge/${wsA}/../${wsB}/doc.txt`,
  wsA,
  "../ sibling tenant",
);

// ..\ style (normalized to /)
assertRejects(
  `data/uploads/knowledge/${wsA}/..\\..\\..\\secret.txt`,
  wsA,
  "..\\ traversal",
);

// %2e%2e (URL-encoded dots)
assertRejects(
  `data/uploads/knowledge/${wsA}/%2e%2e/%2e%2e/%2e%2e/secret.txt`,
  wsA,
  "%2e%2e",
);
assertRejects(
  `data/uploads/knowledge/${wsA}/%2E%2E/%2E%2E/%2E%2E/secret.txt`,
  wsA,
  "%2E%2E uppercase",
);

// Double URL encoding (%252e → %2e → .)
assertRejects(
  `data/uploads/knowledge/${wsA}/%252e%252e/%252e%252e/%252e%252e/secret.txt`,
  wsA,
  "double URL encoding",
);

// Absolute paths outside root
assertRejects(path.join(cwd, "secret.txt"), wsA, "absolute outside");
assertRejects("/etc/passwd", wsA, "absolute /etc/passwd");

// Mixed separators
assertRejects(
  `data/uploads/knowledge/${wsA}/..\\../..\\secret.txt`,
  wsA,
  "mixed separators",
);

// Null-byte injection
assertRejects(
  `data/uploads/knowledge/${wsA}/doc.txt\0.png`,
  wsA,
  "null-byte suffix",
);
assertRejects(
  `data/uploads/knowledge/${wsA}/..\0/secret.txt`,
  wsA,
  "null-byte mid",
);

// Hostile workspace ids
assert.throws(
  () => assertSafePathSegment("..", "workspace id"),
  (err) => err instanceof PathEscapeError,
);
assert.throws(
  () => assertSafePathSegment("a/b", "workspace id"),
  (err) => err instanceof PathEscapeError,
);
assert.throws(
  () => assertSafePathSegment("a%2eb", "workspace id"),
  (err) => err instanceof PathEscapeError,
);

// Symlink escape (when platform supports symlinks)
{
  const escapeLink = path.join(dirA, "escape-link");
  let symlinkSupported = true;
  try {
    fs.symlinkSync(path.join(cwd, "secret.txt"), escapeLink);
  } catch (error) {
    symlinkSupported = false;
    if (process.env.CI) {
      throw error;
    }
    console.warn(
      "symlink escape test skipped:",
      error && error.message ? error.message : error,
    );
  }
  if (symlinkSupported) {
    assertRejects(
      `data/uploads/knowledge/${wsA}/escape-link`,
      wsA,
      "symlink escape",
    );
  }
}

// Nested symlink dir pointing outside root
{
  const outsideDir = path.join(cwd, "outside-dir");
  fs.mkdirSync(outsideDir, { recursive: true });
  fs.writeFileSync(path.join(outsideDir, "leak.txt"), "leaked");
  const linkDir = path.join(dirA, "linked-out");
  let ok = true;
  try {
    fs.symlinkSync(outsideDir, linkDir);
  } catch (error) {
    ok = false;
    console.warn(
      "symlink dir escape test skipped:",
      error && error.message ? error.message : error,
    );
  }
  if (ok) {
    assertRejects(
      `data/uploads/knowledge/${wsA}/linked-out/leak.txt`,
      wsA,
      "symlink dir escape",
    );
  }
}

// Root-only containment still rejects escape when workspaceId omitted
assertRejects(
  `data/uploads/knowledge/${wsA}/../../../secret.txt`,
  undefined,
  "root-only ../",
);
{
  const ok = resolve(`data/uploads/knowledge/${wsA}/doc.txt`);
  assert.equal(fs.readFileSync(ok, "utf8"), "tenant-a");
}

// Cleanup
fs.rmSync(tmp, { recursive: true, force: true });

console.log("knowledge path containment security tests passed");
