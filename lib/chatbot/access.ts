import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureChatbotReady } from "@/lib/chatbot/repository";

export class ChatbotAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "ChatbotAuthError";
    this.status = status;
  }
}

type ChatbotWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveChatbotContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: ChatbotWorkspace;
  role: WorkspaceRole;
}> {
  ensureChatbotReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new ChatbotAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new ChatbotAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new ChatbotAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new ChatbotAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new ChatbotAuthError(
      "Only workspace owners and admins can perform this Chatbot action.",
      403,
    );
  }

  return {
    session,
    workspace: {
      id: fullOrg.id,
      name: fullOrg.name,
      slug: fullOrg.slug,
      logo: fullOrg.logo,
    },
    role,
  };
}

/** Page-level: authenticated workspace member. */
export async function requireChatbotWorkspace(callbackUrl = "/chatbot") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureChatbotReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireChatbotMemberApi() {
  return resolveChatbotContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireChatbotManagerApi() {
  return resolveChatbotContext({ managersOnly: true });
}
