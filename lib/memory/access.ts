import { createModuleAccess } from "@/lib/platform/access";
import { ensureMemoryReady } from "@/lib/memory/repository";

const access = createModuleAccess({
  errorName: "MemoryAuthError",
  ensureReady: ensureMemoryReady,
  managerMessage:
    "Only workspace owners and admins can perform this Memory Engine action.",
});

export const MemoryAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireMemoryWorkspace(callbackUrl = "/memory") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireMemoryMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireMemoryManagerApi() {
  return access.requireManagerApi();
}
