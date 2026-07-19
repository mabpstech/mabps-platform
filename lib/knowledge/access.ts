import { createModuleAccess } from "@/lib/platform/access";
import { ensureKnowledgeReady } from "@/lib/knowledge/repository";

const access = createModuleAccess({
  errorName: "KnowledgeAuthError",
  ensureReady: ensureKnowledgeReady,
  managerMessage:
    "Only workspace owners and admins can perform this Knowledge Base action.",
});

export const KnowledgeAuthError = access.AuthError;

/** Page-level: authenticated workspace member. */
export async function requireKnowledgeWorkspace(callbackUrl = "/knowledge") {
  return access.requireWorkspace(callbackUrl);
}

/** Any authenticated workspace member. */
export async function requireKnowledgeMemberApi() {
  return access.requireMemberApi();
}

/** Owner/admin only. */
export async function requireKnowledgeManagerApi() {
  return access.requireManagerApi();
}
