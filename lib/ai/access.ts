import { createModuleAccess } from "@/lib/platform/access";
import { ensureAiReady } from "@/lib/ai/repository";

const access = createModuleAccess({
  errorName: "AiAuthError",
  ensureReady: ensureAiReady,
  managerMessage:
    "Only workspace owners and admins can perform this AI Assistant action.",
});

export const AiAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireAiWorkspace(callbackUrl = "/ai") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireAiMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireAiManagerApi() {
  return access.requireManagerApi();
}
