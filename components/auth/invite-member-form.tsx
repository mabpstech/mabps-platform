"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  formatWorkspaceRole,
  INVITE_ROLES,
  type InviteRole,
} from "@/lib/auth/permissions";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";

export function InviteMemberForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const { error: inviteError } = await authClient.organization.inviteMember({
      email,
      role,
    });

    if (inviteError) {
      setError(inviteError.message ?? "Unable to send invitation.");
      setPending(false);
      return;
    }

    setSuccess(`Invitation sent to ${email}.`);
    setEmail("");
    setRole("staff");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="invite-email" className={authLabelClassName}>
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClassName}
            disabled={pending}
            placeholder="teammate@company.com"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className={authLabelClassName}>
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as InviteRole)
            }
            className={authInputClassName}
            disabled={pending}
          >
            {INVITE_ROLES.map((inviteRole) => (
              <option key={inviteRole} value={inviteRole}>
                {formatWorkspaceRole(inviteRole)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      {success ? <div className={authSuccessClassName}>{success}</div> : null}
      <button type="submit" disabled={pending} className={`${authButtonClassName} sm:w-auto`}>
        {pending ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
