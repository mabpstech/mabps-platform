import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureWebsiteReady, getSiteById } from "@/lib/website/repository";
import type { WebsiteSite } from "@/lib/website/types";

export class WebsiteAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "WebsiteAuthError";
    this.status = status;
  }
}

type WebsiteWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveWebsiteContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: WebsiteWorkspace;
  role: WorkspaceRole;
}> {
  ensureWebsiteReady();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new WebsiteAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new WebsiteAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new WebsiteAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new WebsiteAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new WebsiteAuthError(
      "Only workspace owners and admins can manage the website builder.",
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
export async function requireWebsiteWorkspace(
  callbackUrl = "/sites",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
  });
  ensureWebsiteReady();
  return { session, workspace, role };
}

/** Any authenticated workspace member. */
export async function requireWebsiteMemberApi() {
  return resolveWebsiteContext({ managersOnly: false });
}

/** Owner/admin only (create site, publish, delete). */
export async function requireWebsiteManagerApi() {
  return resolveWebsiteContext({ managersOnly: true });
}

/** Load a site and ensure it belongs to the active workspace. */
export async function requireSiteForWorkspace(
  siteId: string,
  workspaceId: string,
): Promise<WebsiteSite> {
  ensureWebsiteReady();
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspaceId) {
    throw new WebsiteAuthError("Site not found.", 404);
  }
  return site;
}
