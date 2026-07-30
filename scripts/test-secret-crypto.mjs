#!/usr/bin/env node
/**
 * Smoke test for scripts/lib/secret-crypto.mjs (Phase A secrets-at-rest).
 * Run: node ./scripts/test-secret-crypto.mjs
 */

import assert from "node:assert/strict";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
  ENCRYPTED_SECRET_PREFIX,
} from "./lib/secret-crypto.mjs";

const previousKey = process.env.MABPS_SECRETS_KEY;
const previousEnv = process.env.NODE_ENV;

try {
  process.env.NODE_ENV = "development";
  delete process.env.MABPS_SECRETS_KEY;
  assert.equal(encryptSecret("plain-token"), "plain-token");
  assert.equal(decryptSecret("plain-token"), "plain-token");

  process.env.NODE_ENV = "production";
  delete process.env.MABPS_SECRETS_KEY;
  assert.throws(
    () => encryptSecret("must-not-store-plaintext"),
    /MABPS_SECRETS_KEY is required in production/,
  );

  process.env.NODE_ENV = "development";
  process.env.MABPS_SECRETS_KEY = "test-key-for-secret-crypto-smoke";
  const cipher = encryptSecret("sk-live-example-secret");
  assert.ok(cipher.startsWith(ENCRYPTED_SECRET_PREFIX));
  assert.ok(isEncryptedSecret(cipher));
  assert.equal(decryptSecret(cipher), "sk-live-example-secret");
  assert.equal(encryptSecret(cipher), cipher, "idempotent encrypt");
  assert.notEqual(cipher, encryptSecret("sk-live-example-secret"));

  assert.throws(() => {
    delete process.env.MABPS_SECRETS_KEY;
    decryptSecret(cipher);
  }, /MABPS_SECRETS_KEY/);

  process.env.MABPS_SECRETS_KEY = "different-key";
  assert.throws(() => decryptSecret(cipher), /Failed to decrypt/);

  console.log("secret-crypto smoke test passed");
} finally {
  if (previousKey === undefined) delete process.env.MABPS_SECRETS_KEY;
  else process.env.MABPS_SECRETS_KEY = previousKey;
  if (previousEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnv;
}
