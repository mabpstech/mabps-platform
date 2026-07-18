"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type WorkspaceOption = {
  id: string;
  name: string;
  slug: string;
};

type WorkspaceSwitcherProps = {
  workspaces: WorkspaceOption[];
  activeWorkspaceId?: string | null;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(organizationId: string) {
    if (!organizationId || organizationId === activeWorkspaceId) {
      return;
    }
    setPending(true);
    setError(null);
    const { error: setActiveError } = await authClient.organization.setActive({
      organizationId,
    });
    if (setActiveError) {
      setError(setActiveError.message ?? "Unable to switch workspace.");
      setPending(false);
      return;
    }
    router.refresh();
    setPending(false);
  }

  if (!workspaces.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="workspace-switcher" className="sr-only">
        Active workspace
      </label>
      <select
        id="workspace-switcher"
        disabled={pending}
        value={activeWorkspaceId ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 disabled:opacity-60"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
