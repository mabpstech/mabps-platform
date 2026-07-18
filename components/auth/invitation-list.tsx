"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authErrorClassName } from "@/lib/auth/styles";

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
};

type InvitationListProps = {
  invitations: Invitation[];
  canManage: boolean;
};

export function InvitationList({ invitations, canManage }: InvitationListProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function cancelInvitation(invitationId: string) {
    setPendingId(invitationId);
    setError(null);
    const { error: cancelError } = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (cancelError) {
      setError(cancelError.message ?? "Unable to cancel invitation.");
      setPendingId(null);
      return;
    }
    router.refresh();
    setPendingId(null);
  }

  if (!invitations.length) {
    return <p className="text-sm text-zinc-500">No pending invitations.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-zinc-900">{invitation.email}</p>
              <p className="text-sm text-zinc-500">
                Role: {invitation.role} · Status: {invitation.status}
              </p>
            </div>
            {canManage ? (
              <button
                type="button"
                disabled={pendingId === invitation.id}
                onClick={() => cancelInvitation(invitation.id)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
