import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureAiReady } from "@/lib/ai/repository";

export class AiAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AiAuthError";
    this.status = status;
  }
}

type AiWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveAiContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: AiWorkspace;
  role: WorkspaceRole;
}> {
  ensureAiReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new AiAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new AiAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new AiAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new AiAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new AiAuthError(
      "Only workspace owners and admins can perform this AI Assistant action.",
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
export async function requireAiWorkspace(callbackUrl = "/ai") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureAiReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireAiMemberApi() {
  return resolveAiContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireAiManagerApi() {
  return resolveAiContext({ managersOnly: true });
}
