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
  PUBLIC_RATE_LIMITS,
  checkRateLimit,
  enforcePublicRateLimit,
  rateLimitResponse,
  resetRateLimitStore,
  getClientIp,
  type RateLimitBucket,
  type RateLimitResult,
} from "@/lib/platform/rate-limit";
