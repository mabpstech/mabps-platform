import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { ensureActiveWorkspace } from "@/lib/auth/workspace";

export default async function DashboardPage() {
  const session = await requireSession({ callbackUrl: "/dashboard" });
  const workspace = await ensureActiveWorkspace(session);

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Signed in as {session.user.email}. Active workspace:{" "}
          <span className="font-medium text-zinc-800">{workspace.name}</span>
          {workspace.slug ? (
            <span className="text-zinc-400"> ({workspace.slug})</span>
          ) : null}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900">Workspace ready</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          Authentication, sessions, and multi-tenant workspaces are live. Later
          Core modules will mount into this shell.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/settings/workspace/members"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            Manage members
          </Link>
          <Link
            href="/settings/workspace/invitations"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            Invitations
          </Link>
          <Link
            href="/settings/account"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
          >
            Account settings
          </Link>
        </div>
      </div>
    </div>
  );
}
