"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  formatWorkspaceRole,
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from "@/lib/auth/permissions";
import { authErrorClassName } from "@/lib/auth/styles";

type Member = {
  id: string;
  userId: string;
  role: string;
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

type MemberListProps = {
  members: Member[];
  currentUserId: string;
  canManage: boolean;
  currentUserRole: WorkspaceRole;
};

export function MemberList({
  members,
  currentUserId,
  canManage,
  currentUserRole,
}: MemberListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const assignableRoles: WorkspaceRole[] =
    currentUserRole === "owner"
      ? [...WORKSPACE_ROLES]
      : (["admin", "staff"] as WorkspaceRole[]);

  async function updateRole(memberId: string, role: string) {
    setPendingId(memberId);
    setError(null);
    const { error: updateError } = await authClient.organization.updateMemberRole({
      memberId,
      role,
    });
    if (updateError) {
      setError(updateError.message ?? "Unable to update role.");
      setPendingId(null);
      return;
    }
    router.refresh();
    setPendingId(null);
  }

  async function removeMember(memberIdOrEmail: string) {
    setPendingId(memberIdOrEmail);
    setError(null);
    const { error: removeError } = await authClient.organization.removeMember({
      memberIdOrEmail,
    });
    if (removeError) {
      setError(removeError.message ?? "Unable to remove member.");
      setPendingId(null);
      return;
    }
    router.refresh();
    setPendingId(null);
  }

  return (
    <div className="space-y-3">
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {members.map((member) => {
          const isSelf = member.userId === currentUserId;
          const isOwnerTarget = member.role === "owner";
          const canEditThis =
            canManage &&
            !isSelf &&
            !(isOwnerTarget && currentUserRole !== "owner");

          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {member.user.name}
                  {isSelf ? " (you)" : ""}
                </p>
                <p className="text-sm text-zinc-500">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {canEditThis ? (
                  <>
                    <select
                      value={
                        member.role === "member" ? "staff" : member.role
                      }
                      disabled={pendingId === member.id}
                      onChange={(event) =>
                        updateRole(member.id, event.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    >
                      {assignableRoles.map((role) => (
                        <option key={role} value={role}>
                          {formatWorkspaceRole(role)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pendingId === member.id}
                      onClick={() => removeMember(member.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                    {formatWorkspaceRole(member.role)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
