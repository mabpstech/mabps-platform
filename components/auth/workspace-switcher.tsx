"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type WorkspaceOption = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
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

    if (organizationId === "__create__") {
      router.push("/onboarding?new=1");
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
    return (
      <Link
        href="/onboarding"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 hover:bg-zinc-50"
      >
        Create workspace
      </Link>
    );
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
        className="max-w-[12rem] truncate rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 disabled:opacity-60"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
        <option value="__create__">+ Create workspace</option>
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
