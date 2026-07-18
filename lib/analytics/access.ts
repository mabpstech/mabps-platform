import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureAnalyticsReady } from "@/lib/analytics/repository";

export class AnalyticsAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AnalyticsAuthError";
    this.status = status;
  }
}

type AnalyticsWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveAnalyticsContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: AnalyticsWorkspace;
  role: WorkspaceRole;
}> {
  ensureAnalyticsReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new AnalyticsAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new AnalyticsAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new AnalyticsAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new AnalyticsAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new AnalyticsAuthError(
      "Only workspace owners and admins can perform this Analytics action.",
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
export async function requireAnalyticsWorkspace(callbackUrl = "/analytics") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureAnalyticsReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireAnalyticsMemberApi() {
  return resolveAnalyticsContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireAnalyticsManagerApi() {
  return resolveAnalyticsContext({ managersOnly: true });
}
