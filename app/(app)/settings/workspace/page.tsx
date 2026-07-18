import Link from "next/link";
import { WorkspaceSettingsForm } from "@/components/auth/workspace-settings-form";
import { isWorkspaceManager, isWorkspaceOwner } from "@/lib/auth/permissions";
import { requireWorkspace } from "@/lib/auth/workspace";

export default async function WorkspaceSettingsPage() {
  const { workspace, role } = await requireWorkspace({
    callbackUrl: "/settings/workspace",
  });
  const canEdit = isWorkspaceManager(role);
  const canDelete = isWorkspaceOwner(role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {workspace.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={workspace.logo}
              alt=""
              className="h-10 w-10 rounded-md border border-zinc-200 object-cover"
            />
          ) : null}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Workspace settings
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              General settings for {workspace.name}.
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-sm">
          <Link
            href="/settings/workspace/members"
            className="text-zinc-700 underline-offset-2 hover:underline"
          >
            Members
          </Link>
          <Link
            href="/settings/workspace/invitations"
            className="text-zinc-700 underline-offset-2 hover:underline"
          >
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
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}
