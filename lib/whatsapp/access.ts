import { createModuleAccess } from "@/lib/platform/access";
import { ensureWhatsAppReady } from "@/lib/whatsapp/repository";

const access = createModuleAccess({
  errorName: "WhatsAppAuthError",
  ensureReady: ensureWhatsAppReady,
  managerMessage:
    "Only workspace owners and admins can perform this WhatsApp action.",
});

export const WhatsAppAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireWhatsAppWorkspace(callbackUrl = "/whatsapp") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireWhatsAppMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireWhatsAppManagerApi() {
  return access.requireManagerApi();
}
