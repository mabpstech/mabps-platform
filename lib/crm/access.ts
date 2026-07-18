import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureCrmReady } from "@/lib/crm/repository";

export class CrmAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "CrmAuthError";
    this.status = status;
  }
}

type CrmWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveCrmContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: CrmWorkspace;
  role: WorkspaceRole;
}> {
  ensureCrmReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new CrmAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new CrmAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new CrmAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new CrmAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new CrmAuthError(
      "Only workspace owners and admins can perform this CRM action.",
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
export async function requireCrmWorkspace(callbackUrl = "/crm") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureCrmReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireCrmMemberApi() {
  return resolveCrmContext({ managersOnly: false });
}

/** Owner/admin only (destructive / import). */
export async function requireCrmManagerApi() {
  return resolveCrmContext({ managersOnly: true });
}
