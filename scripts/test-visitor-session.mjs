#!/usr/bin/env node
/**
 * Smoke test for visitor session secret hashing (logic mirrored inline;
 * TypeScript source of truth: lib/chatbot/visitor-session.ts).
 * Run: node ./scripts/test-visitor-session.mjs
 */

import assert from "node:assert/strict";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function hashVisitorSessionSecret(secret) {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

function generateVisitorSessionSecret() {
  const secret = `cbs_${randomBytes(24).toString("hex")}`;
  return { secret, hash: hashVisitorSessionSecret(secret) };
}

function visitorSessionSecretsMatch(storedHash, provided) {
  if (!storedHash || !provided) return false;
  const a = Buffer.from(storedHash, "utf8");
  const b = Buffer.from(hashVisitorSessionSecret(provided), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const { secret, hash } = generateVisitorSessionSecret();
assert.ok(secret.startsWith("cbs_"));
assert.equal(hash.length, 64);
assert.ok(visitorSessionSecretsMatch(hash, secret));
assert.equal(visitorSessionSecretsMatch(hash, "wrong"), false);
assert.equal(visitorSessionSecretsMatch(null, secret), false);
assert.equal(visitorSessionSecretsMatch(hash, null), false);
assert.ok(!secret.includes(hash));

console.log("visitor-session smoke test passed");
