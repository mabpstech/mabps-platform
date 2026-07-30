/**
 * Provider secrets at rest (AES-256-GCM).
 *
 * When `MABPS_SECRETS_KEY` is unset, encrypt/decrypt are passthrough so existing
 * plaintext rows keep working. When set, new writes are prefixed `mabps:v1:`.
 * Plaintext (unprefixed) values still decrypt as-is until migrated.
 *
 * Do not encrypt values used as SQL equality lookup keys (webhook path secrets,
 * verify tokens, automation API keys) — those need a different design.
 *
 * Keep algorithm in sync with `scripts/lib/secret-crypto.mjs`.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const SECRETS_KEY_ENV = "MABPS_SECRETS_KEY";
export const ENCRYPTED_SECRET_PREFIX = "mabps:v1:";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export function isSecretsKeyConfigured(): boolean {
  return Boolean(process.env[SECRETS_KEY_ENV]?.trim());
}

export function isEncryptedSecret(
  value: string | null | undefined,
): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_SECRET_PREFIX);
}

function resolveKeyBytes(): Buffer | null {
  const raw = process.env[SECRETS_KEY_ENV]?.trim();
  if (!raw) return null;

  // Prefer 32-byte keys from base64 or hex; otherwise derive via SHA-256.
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

/**
 * Encrypt a secret for DB storage. No-op when key unset or value already encrypted.
 */
export function encryptSecret(plaintext: string): string {
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

/**
 * Decrypt a stored secret. Passthrough for plaintext. Throws if ciphertext
 * is present but `MABPS_SECRETS_KEY` is missing or wrong.
 */
export function decryptSecret(stored: string): string {
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

export function encryptOptionalSecret(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  return encryptSecret(value);
}

export function decryptOptionalSecret(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  return decryptSecret(value);
}

/** Constant-time check that two plaintexts match after decrypting stored form. */
export function decryptedSecretsEqual(
  stored: string | null | undefined,
  provided: string | null | undefined,
): boolean {
  if (!stored || !provided) return false;
  const plain = decryptSecret(stored);
  const a = Buffer.from(plain);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
