import { createModuleAccess } from "@/lib/platform/access";
import { ensureChatbotReady } from "@/lib/chatbot/repository";

const access = createModuleAccess({
  errorName: "ChatbotAuthError",
  ensureReady: ensureChatbotReady,
  managerMessage:
    "Only workspace owners and admins can perform this Chatbot action.",
});

export const ChatbotAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireChatbotWorkspace(callbackUrl = "/chatbot") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireChatbotMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireChatbotManagerApi() {
  return access.requireManagerApi();
}
