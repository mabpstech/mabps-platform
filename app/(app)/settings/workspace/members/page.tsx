import { headers } from "next/headers";
import Link from "next/link";
import { MemberList } from "@/components/auth/member-list";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth/server";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function WorkspaceMembersPage() {
  const { session, workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace/members",
  });

  const fullOrg = await auth.api.getFullOrganization({
    headers: await headers(),
    query: { organizationId: workspace.id },
  });

  const canManage = isWorkspaceManager(role);
  const members = (fullOrg?.members ?? []).map((member) => ({
    id: member.id,
    userId: member.userId,
    role: member.role,
    user: {
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Members
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            People in {workspace.name}. Roles: Owner, Admin, Staff.
          </p>
        </div>
        {canManage ? (
          <Link
            href="/settings/workspace/invitations"
            className="text-sm text-zinc-700 underline-offset-2 hover:underline"
          >
            Manage invitations
          </Link>
        ) : null}
      </div>

      <MemberList
        members={members}
        currentUserId={session.user.id}
        canManage={canManage}
        currentUserRole={role}
      />
    </div>
  );
}
