import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureDeploymentReady } from "@/lib/deployment/repository";

export class DeploymentAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "DeploymentAuthError";
    this.status = status;
  }
}

type DeploymentWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveDeploymentContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: DeploymentWorkspace;
  role: WorkspaceRole;
}> {
  ensureDeploymentReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new DeploymentAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new DeploymentAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new DeploymentAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new DeploymentAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new DeploymentAuthError(
      "Only workspace owners and admins can perform this Deployment action.",
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
export async function requireDeploymentWorkspace(
  callbackUrl = "/deployment",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureDeploymentReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireDeploymentMemberApi() {
  return resolveDeploymentContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireDeploymentManagerApi() {
  return resolveDeploymentContext({ managersOnly: true });
}
