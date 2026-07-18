import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/session";

export type { WorkspaceRole };

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: Date;
  role?: WorkspaceRole | string;
};

async function listMemberships() {
  const requestHeaders = await headers();
  return auth.api.listOrganizations({
    headers: requestHeaders,
  });
}

/**
 * Ensures the session has an active workspace (Better Auth organization).
 * Prefer the current activeOrganizationId; otherwise activate the first membership.
 */
export async function ensureActiveWorkspace(
  session: Session,
): Promise<WorkspaceSummary | null> {
  const memberships = await listMemberships();
  if (!memberships?.length) {
    return null;
  }

  const requestHeaders = await headers();
  const activeId = session.session.activeOrganizationId;

  if (activeId) {
    const active = memberships.find((org) => org.id === activeId);
    if (active) {
      return active as WorkspaceSummary;
    }
  }

  const fallback = memberships[0];
  await auth.api.setActiveOrganization({
    body: { organizationId: fallback.id },
    headers: requestHeaders,
  });

  return fallback as WorkspaceSummary;
}

export async function requireWorkspace(options: {
  callbackUrl?: string;
  roles?: WorkspaceRole[];
  managersOnly?: boolean;
} = {}): Promise<{
  session: Session;
  workspace: WorkspaceSummary;
  role: WorkspaceRole;
}> {
  const session = await requireSession({ callbackUrl: options.callbackUrl });
  const workspace = await ensureActiveWorkspace(session);

  if (!workspace) {
    redirect("/onboarding");
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  const membership = fullOrg?.members?.find(
    (member) => member.userId === session.user.id,
  );
  const role = normalizeWorkspaceRole(membership?.role);

  if (options.managersOnly && !isWorkspaceManager(role)) {
    redirect("/dashboard");
  }

  if (options.roles?.length && !options.roles.includes(role)) {
    redirect("/dashboard");
  }

  return { session, workspace, role };
}

export async function getUserWorkspaces(): Promise<WorkspaceSummary[]> {
  const memberships = await listMemberships();
  return (memberships ?? []) as WorkspaceSummary[];
}

/**
 * Resolve the caller's role in the active workspace.
 * Prefer this over trusting a client-sent workspace id for tenancy checks.
 */
export async function getActiveWorkspaceRole(
  session: Session,
): Promise<{ workspace: WorkspaceSummary; role: WorkspaceRole } | null> {
  const workspace = await ensureActiveWorkspace(session);
  if (!workspace) {
    return null;
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  const membership = fullOrg?.members?.find(
    (member) => member.userId === session.user.id,
  );

  if (!membership) {
    return null;
  }

  return {
    workspace,
    role: normalizeWorkspaceRole(membership.role),
  };
}
