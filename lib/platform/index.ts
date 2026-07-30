export {
  PlatformAuthError,
  createModuleAccess,
  type PlatformAccessContext,
  type PlatformWorkspace,
} from "@/lib/platform/access";
export {
  platformErrorResponse,
  parsePagination,
  type PlatformErrorResponseOptions,
} from "@/lib/platform/http";
export { createSchemaMigrator } from "@/lib/platform/migrate";
export {
  maskSecret,
  normalizeEmail,
  isValidEmail,
  truncateSummary,
  slugify,
} from "@/lib/platform/secrets";
export {
  SECRETS_KEY_ENV,
  ENCRYPTED_SECRET_PREFIX,
  isSecretsKeyConfigured,
  isEncryptedSecret,
  encryptSecret,
  decryptSecret,
  encryptOptionalSecret,
  decryptOptionalSecret,
} from "@/lib/platform/secret-crypto";
export {
  PUBLIC_RATE_LIMITS,
  checkRateLimit,
  enforcePublicRateLimit,
  rateLimitResponse,
  resetRateLimitStore,
  getClientIp,
  type RateLimitBucket,
  type RateLimitResult,
} from "@/lib/platform/rate-limit";
export {
  CacheKeys,
  cacheClear,
  cacheDelete,
  cacheDeleteByPrefix,
  cacheGet,
  cacheGetOrSet,
  cacheSet,
  getCacheStats,
  invalidateWorkspaceEntitlements,
  invalidateWorkspaceSettings,
  resolveCacheDriver,
  type CacheDriver,
  type CacheStats,
} from "@/lib/platform/cache";
