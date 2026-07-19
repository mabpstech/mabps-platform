import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureEmailEngineReady } from "@/lib/email-engine/repository";

export class EmailEngineAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "EmailEngineAuthError";
    this.status = status;
  }
}

type EmailWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveEmailContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: EmailWorkspace;
  role: WorkspaceRole;
}> {
  ensureEmailEngineReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new EmailEngineAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new EmailEngineAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new EmailEngineAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new EmailEngineAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new EmailEngineAuthError(
      "Only workspace owners and admins can perform this Email Engine action.",
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
export async function requireEmailWorkspace(callbackUrl = "/email") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureEmailEngineReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireEmailMemberApi() {
  return resolveEmailContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireEmailManagerApi() {
  return resolveEmailContext({ managersOnly: true });
}
