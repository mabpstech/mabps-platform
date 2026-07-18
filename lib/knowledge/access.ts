import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureKnowledgeReady } from "@/lib/knowledge/repository";

export class KnowledgeAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "KnowledgeAuthError";
    this.status = status;
  }
}

type KnowledgeWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveKnowledgeContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: KnowledgeWorkspace;
  role: WorkspaceRole;
}> {
  ensureKnowledgeReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new KnowledgeAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new KnowledgeAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new KnowledgeAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new KnowledgeAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new KnowledgeAuthError(
      "Only workspace owners and admins can perform this Knowledge Base action.",
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
export async function requireKnowledgeWorkspace(
  callbackUrl = "/knowledge",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureKnowledgeReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireKnowledgeMemberApi() {
  return resolveKnowledgeContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireKnowledgeManagerApi() {
  return resolveKnowledgeContext({ managersOnly: true });
}
