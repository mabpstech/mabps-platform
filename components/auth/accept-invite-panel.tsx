"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  authButtonClassName,
  authErrorClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";

type AcceptInvitePanelProps = {
  invitationId: string;
  isAuthenticated: boolean;
  workspaceName?: string | null;
  role?: string | null;
  inviterEmail?: string | null;
  errorMessage?: string | null;
};

export function AcceptInvitePanel({
  invitationId,
  isAuthenticated,
  workspaceName,
  role,
  inviterEmail,
  errorMessage,
}: AcceptInvitePanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(errorMessage ?? null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function acceptInvite() {
    setPending(true);
    setError(null);

    const { data, error: acceptError } = await authClient.organization.acceptInvitation({
      invitationId,
    });

    if (acceptError || !data) {
      setError(acceptError?.message ?? "Unable to accept invitation.");
      setPending(false);
      return;
    }

    const organizationId =
      data.member?.organizationId ?? data.invitation?.organizationId;

    if (organizationId) {
      await authClient.organization.setActive({ organizationId });
    }

    setSuccess(true);
    setPending(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (!invitationId) {
    return (
      <div className={authErrorClassName}>
        Missing invitation. Open the link from your invite email.
      </div>
    );
  }

  if (!isAuthenticated) {
    const next = `/accept-invite?invitationId=${encodeURIComponent(invitationId)}`;
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Sign in or create an account with the invited email to join
          {workspaceName ? ` ${workspaceName}` : " this workspace"}.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(next)}`}
            className={authButtonClassName}
          >
            Sign in to accept
          </Link>
          <Link
            href={`/signup?callbackUrl=${encodeURIComponent(next)}`}
            className="inline-flex w-full items-center justify-center rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
        <p>
          Workspace: <strong>{workspaceName ?? "Unknown workspace"}</strong>
        </p>
        <p>
          Role: <strong>{role ?? "member"}</strong>
        </p>
        {inviterEmail ? <p>Invited by: {inviterEmail}</p> : null}
      </div>
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      {success ? (
        <div className={authSuccessClassName}>Invitation accepted. Redirecting…</div>
      ) : null}
      <button
        type="button"
        onClick={acceptInvite}
        disabled={pending || success}
        className={authButtonClassName}
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </button>
    </div>
  );
}
