import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * MABPS workspace roles map to Better Auth organization roles.
 * Product roles: Owner, Admin, Staff.
 * `member` is retained as a Staff alias for Better Auth compatibility.
 */
const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
});

export const admin = ac.newRole({
  ...adminAc.statements,
});

export const staff = ac.newRole({
  ...memberAc.statements,
});

/** Alias of Staff — kept so Better Auth default role name remains valid. */
export const member = ac.newRole({
  ...memberAc.statements,
});

export const workspaceAccessRoles = {
  owner,
  admin,
  staff,
  member,
} as const;

export const WORKSPACE_ROLES = ["owner", "admin", "staff"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  member: "Staff",
};

export const INVITE_ROLES = ["admin", "staff"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

export function normalizeWorkspaceRole(role: string | null | undefined): WorkspaceRole {
  if (role === "owner" || role === "admin" || role === "staff") {
    return role;
  }
  if (role === "member") {
    return "staff";
  }
  return "staff";
}

export function isWorkspaceManager(role: string | null | undefined): boolean {
  const normalized = normalizeWorkspaceRole(role);
  return normalized === "owner" || normalized === "admin";
}

export function isWorkspaceOwner(role: string | null | undefined): boolean {
  return normalizeWorkspaceRole(role) === "owner";
}

export function formatWorkspaceRole(role: string | null | undefined): string {
  if (!role) {
    return WORKSPACE_ROLE_LABELS.staff;
  }
  return WORKSPACE_ROLE_LABELS[role] ?? role;
}
