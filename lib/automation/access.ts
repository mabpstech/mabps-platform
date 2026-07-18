import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureAutomationReady } from "@/lib/automation/repository";

export class AutomationAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AutomationAuthError";
    this.status = status;
  }
}

type AutomationWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveAutomationContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: AutomationWorkspace;
  role: WorkspaceRole;
}> {
  ensureAutomationReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new AutomationAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new AutomationAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new AutomationAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new AutomationAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new AutomationAuthError(
      "Only workspace owners and admins can perform this Automation action.",
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
export async function requireAutomationWorkspace(
  callbackUrl = "/automations",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureAutomationReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireAutomationMemberApi() {
  return resolveAutomationContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireAutomationManagerApi() {
  return resolveAutomationContext({ managersOnly: true });
}
