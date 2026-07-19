import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureWhatsAppReady } from "@/lib/whatsapp/repository";

export class WhatsAppAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "WhatsAppAuthError";
    this.status = status;
  }
}

type WhatsAppWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveWhatsAppContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: WhatsAppWorkspace;
  role: WorkspaceRole;
}> {
  ensureWhatsAppReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new WhatsAppAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new WhatsAppAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new WhatsAppAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new WhatsAppAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new WhatsAppAuthError(
      "Only workspace owners and admins can perform this WhatsApp action.",
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
export async function requireWhatsAppWorkspace(callbackUrl = "/whatsapp") {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureWhatsAppReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireWhatsAppMemberApi() {
  return resolveWhatsAppContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireWhatsAppManagerApi() {
  return resolveWhatsAppContext({ managersOnly: true });
}
