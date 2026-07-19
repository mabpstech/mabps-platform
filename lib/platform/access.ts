import { headers } from "next/headers";
import {
  isWorkspaceManager,
  normalizeWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { auth, type Session } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";

/** Shared auth error for module API/page guards. */
export class PlatformAuthError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "PlatformAuthError";
    this.status = status;
  }
}

export type PlatformWorkspace = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

export type PlatformAccessContext = {
  session: Session;
  workspace: PlatformWorkspace;
  role: WorkspaceRole;
};

type CreateModuleAccessOptions<TExtra extends object = object> = {
  errorName: string;
  managerMessage: string;
  ensureReady?: () => void;
  enrich?: (
    ctx: PlatformAccessContext,
  ) => TExtra | Promise<TExtra>;
};

/**
 * Factory for per-module workspace access helpers.
 * Keeps auth/membership/role rules consistent across domains.
 */
export function createModuleAccess<TExtra extends object = object>(
  options: CreateModuleAccessOptions<TExtra>,
) {
  class ModuleAuthError extends PlatformAuthError {
    constructor(message: string, status = 403) {
      super(message, status);
      this.name = options.errorName;
    }
  }

  async function resolveContext(resolveOptions: {
    managersOnly?: boolean;
  }): Promise<PlatformAccessContext & TExtra> {
    options.ensureReady?.();
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });

    if (!session) {
      throw new ModuleAuthError("Authentication required.", 401);
    }

    const activeId = session.session.activeOrganizationId;
    if (!activeId) {
      throw new ModuleAuthError("No active workspace.", 400);
    }

    const fullOrg = await auth.api.getFullOrganization({
      headers: requestHeaders,
      query: { organizationId: activeId },
    });

    if (!fullOrg) {
      throw new ModuleAuthError("Workspace not found.", 404);
    }

    const membership = fullOrg.members?.find(
      (member) => member.userId === session.user.id,
    );
    if (!membership) {
      throw new ModuleAuthError("Not a workspace member.", 403);
    }

    const role = normalizeWorkspaceRole(membership.role);
    if (resolveOptions.managersOnly && !isWorkspaceManager(role)) {
      throw new ModuleAuthError(options.managerMessage, 403);
    }

    const base: PlatformAccessContext = {
      session,
      workspace: {
        id: fullOrg.id,
        name: fullOrg.name,
        slug: fullOrg.slug,
        logo: fullOrg.logo,
      },
      role,
    };

    const extra = options.enrich
      ? await options.enrich(base)
      : ({} as TExtra);

    return { ...base, ...extra };
  }

  async function requireModuleWorkspace(callbackUrl: string) {
    const { session, workspace, role } = await requireWorkspace({
      callbackUrl,
    });
    options.ensureReady?.();
    return { session, workspace, role };
  }

  return {
    AuthError: ModuleAuthError,
    requireMemberApi: () => resolveContext({ managersOnly: false }),
    requireManagerApi: () => resolveContext({ managersOnly: true }),
    requireWorkspace: requireModuleWorkspace,
  };
}
