import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { InvitationList } from "@/components/auth/invitation-list";
import { InviteMemberForm } from "@/components/auth/invite-member-form";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";
import { canInviteMembers } from "@/lib/billing/entitlements";

export default async function WorkspaceInvitationsPage() {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace/invitations",
  });

  if (!isWorkspaceManager(role)) {
    redirect("/settings/workspace/members");
  }

  const fullOrg = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  const invitations = (fullOrg?.invitations ?? [])
    .filter((invitation) => invitation.status === "pending")
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role ?? "staff",
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    }));

  const memberLimit = canInviteMembers(workspace.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Invitations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Invite teammates to {workspace.name} as Admin or Staff.
          </p>
        </div>
        <Link
          href="/settings/workspace/billing"
          className="text-sm text-zinc-700 underline-offset-2 hover:underline"
        >
          Billing & plans
        </Link>
      </div>

      {!memberLimit.allowed ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {memberLimit.message}{" "}
          <Link href="/settings/workspace/billing" className="underline">
            Upgrade
          </Link>
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Invite member
        </h2>
        <InviteMemberForm />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Pending
        </h2>
        <InvitationList invitations={invitations} canManage />
      </section>
    </div>
  );
}
