import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureMarketplaceReady } from "@/lib/marketplace/repository";

export class MarketplaceAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "MarketplaceAuthError";
    this.status = status;
  }
}

type MarketplaceWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveMarketplaceContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: MarketplaceWorkspace;
  role: WorkspaceRole;
}> {
  ensureMarketplaceReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new MarketplaceAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new MarketplaceAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new MarketplaceAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new MarketplaceAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new MarketplaceAuthError(
      "Only workspace owners and admins can perform this Marketplace action.",
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
export async function requireMarketplaceWorkspace(
  callbackUrl = "/marketplace",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureMarketplaceReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireMarketplaceMemberApi() {
  return resolveMarketplaceContext({ managersOnly: false });
}

/** Owner/admin only. */
export async function requireMarketplaceManagerApi() {
  return resolveMarketplaceContext({ managersOnly: true });
}
