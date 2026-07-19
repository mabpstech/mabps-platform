import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureNotificationsReady } from "@/lib/notifications/repository";

export class NotificationsAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "NotificationsAuthError";
    this.status = status;
  }
}

type NotificationsWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveNotificationsContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: NotificationsWorkspace;
  role: WorkspaceRole;
}> {
  ensureNotificationsReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new NotificationsAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new NotificationsAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new NotificationsAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new NotificationsAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new NotificationsAuthError(
      "Only workspace owners and admins can perform this Notifications action.",
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
export async function requireNotificationsWorkspace(
  callbackUrl = "/notifications",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureNotificationsReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireNotificationsMemberApi() {
  return resolveNotificationsContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireNotificationsManagerApi() {
  return resolveNotificationsContext({ managersOnly: true });
}
