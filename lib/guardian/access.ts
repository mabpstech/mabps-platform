import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureGuardianReady } from "@/lib/guardian/repository";

export class GuardianAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "GuardianAuthError";
    this.status = status;
  }
}

type GuardianWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveGuardianContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: GuardianWorkspace;
  role: WorkspaceRole;
}> {
  ensureGuardianReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new GuardianAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new GuardianAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new GuardianAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new GuardianAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new GuardianAuthError(
      "Only workspace owners and admins can perform this Guardian action.",
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
export async function requireGuardianWorkspace(callbackUrl = "/guardian") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureGuardianReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireGuardianMemberApi() {
  return resolveGuardianContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireGuardianManagerApi() {
  return resolveGuardianContext({ managersOnly: true });
}
