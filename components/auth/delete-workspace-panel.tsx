"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authErrorClassName } from "@/lib/auth/styles";

type DeleteWorkspacePanelProps = {
  organizationId: string;
  workspaceName: string;
};

export function DeleteWorkspacePanel({
  organizationId,
  workspaceName,
}: DeleteWorkspacePanelProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (confirmName.trim() !== workspaceName) {
      setError("Type the workspace name exactly to confirm deletion.");
      return;
    }

    setPending(true);
    setError(null);

    const { error: deleteError } = await authClient.organization.delete({
      organizationId,
    });

    if (deleteError) {
      setError(deleteError.message ?? "Unable to delete workspace.");
      setPending(false);
      return;
    }

    const { data: remaining } = await authClient.organization.list();
    if (remaining?.length) {
      await authClient.organization.setActive({
        organizationId: remaining[0].id,
      });
      router.push("/dashboard");
    } else {
      await authClient.organization.setActive({ organizationId: null });
      router.push("/onboarding");
    }
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-md border border-red-200 bg-red-50/40 p-4">
      <div>
        <h2 className="text-sm font-semibold text-red-900">Delete workspace</h2>
        <p className="mt-1 text-sm text-red-800/80">
          Permanently deletes this workspace, its memberships, and pending
          invitations. This cannot be undone.
        </p>
      </div>
      <div>
        <label
          htmlFor="confirm-delete-workspace"
          className="mb-1.5 block text-sm font-medium text-red-900"
        >
          Type <span className="font-semibold">{workspaceName}</span> to confirm
        </label>
        <input
          id="confirm-delete-workspace"
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-red-300 focus:ring-2 disabled:opacity-60"
          disabled={pending}
          autoComplete="off"
        />
      </div>
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      <button
        type="button"
        disabled={pending || confirmName.trim() !== workspaceName}
        onClick={onDelete}
        className="inline-flex items-center justify-center rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete workspace"}
      </button>
    </div>
  );
}
