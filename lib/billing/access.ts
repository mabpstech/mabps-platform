import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { ensureFreeSubscription } from "@/lib/billing/repository";
import type { WorkspaceSubscription } from "@/lib/billing/types";

export class BillingAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "BillingAuthError";
    this.status = status;
  }
}

type BillingWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

async function resolveBillingContext(options: {
  managersOnly?: boolean;
}): Promise<{
  session: Session;
  workspace: BillingWorkspace;
  role: WorkspaceRole;
  subscription: WorkspaceSubscription;
}> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) {
    throw new BillingAuthError("Authentication required.", 401);
  }

  const activeId = session.session.activeOrganizationId;
  if (!activeId) {
    throw new BillingAuthError("No active workspace.", 400);
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: requestHeaders,
    query: { organizationId: activeId },
  });

  if (!fullOrg) {
    throw new BillingAuthError("Workspace not found.", 404);
  }

  const membership = fullOrg.members?.find(
    (member) => member.userId === session.user.id,
  );
  if (!membership) {
    throw new BillingAuthError("Not a workspace member.", 403);
  }

  const role = normalizeWorkspaceRole(membership.role);
  if (options.managersOnly && !isWorkspaceManager(role)) {
    throw new BillingAuthError(
      "Only workspace owners and admins can manage billing.",
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
    subscription: ensureFreeSubscription(fullOrg.id),
  };
}

/**
 * Require an authenticated workspace manager for billing page renders.
 */
export async function requireBillingManager(
  callbackUrl = "/settings/workspace/billing",
) {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl,
    managersOnly: true,
  });

  if (!isWorkspaceManager(role)) {
    throw new BillingAuthError(
      "Only workspace owners and admins can manage billing.",
    );
  }

  const subscription = ensureFreeSubscription(workspace.id);
  return { session, workspace, role, subscription };
}

/** Any authenticated workspace member (read entitlements / usage). */
export async function requireBillingMemberApi() {
  return resolveBillingContext({ managersOnly: false });
}

/** Owner/admin only (checkout, cancel, portal, invoices). */
export async function requireBillingManagerApi() {
  return resolveBillingContext({ managersOnly: true });
}
