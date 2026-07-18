import Link from "next/link";
import { WorkspaceSettingsForm } from "@/components/auth/workspace-settings-form";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function WorkspaceSettingsPage() {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace",
  });
  const canEdit = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Workspace settings
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            General settings for {workspace.name}.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/settings/workspace/members" className="text-zinc-700 underline-offset-2 hover:underline">
            Members
          </Link>
          <Link href="/settings/workspace/invitations" className="text-zinc-700 underline-offset-2 hover:underline">
            Invitations
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <WorkspaceSettingsForm
          organizationId={workspace.id}
          name={workspace.name}
          slug={workspace.slug}
          logo={workspace.logo}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
