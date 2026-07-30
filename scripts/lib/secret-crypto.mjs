/**
 * Provider secrets at rest (AES-256-GCM) — Node script mirror.
 * Keep algorithm in sync with `lib/platform/secret-crypto.ts`.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const SECRETS_KEY_ENV = "MABPS_SECRETS_KEY";
export const ENCRYPTED_SECRET_PREFIX = "mabps:v1:";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function isSecretsKeyConfigured() {
  return Boolean(process.env[SECRETS_KEY_ENV]?.trim());
}

export function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(ENCRYPTED_SECRET_PREFIX);
}

function resolveKeyBytes() {
  const raw = process.env[SECRETS_KEY_ENV]?.trim();
  if (!raw) return null;

  try {
    const fromBase64 = Buffer.from(raw, "base64");
    if (fromBase64.length === 32 && raw.length >= 40) {
      return fromBase64;
    }
  } catch {
    // fall through
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptSecret(plaintext) {
  if (!plaintext) return plaintext;
  if (isEncryptedSecret(plaintext)) return plaintext;

  const key = resolveKeyBytes();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, ciphertext]);
  return `${ENCRYPTED_SECRET_PREFIX}${packed.toString("base64url")}`;
}

export function decryptSecret(stored) {
  if (!stored || !isEncryptedSecret(stored)) return stored;

  const key = resolveKeyBytes();
  if (!key) {
    throw new Error(
      `Encrypted secret found but ${SECRETS_KEY_ENV} is not set. Restore the key or re-enter provider credentials.`,
    );
  }

  const packed = Buffer.from(
    stored.slice(ENCRYPTED_SECRET_PREFIX.length),
    "base64url",
  );
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Encrypted secret payload is truncated or invalid.");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error(
      `Failed to decrypt secret. Check that ${SECRETS_KEY_ENV} matches the key used to encrypt.`,
    );
  }
}
