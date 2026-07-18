import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { WorkspaceSwitcher } from "@/components/auth/workspace-switcher";
import { requireSession } from "@/lib/auth/session";
import {
  ensureActiveWorkspace,
  getUserWorkspaces,
} from "@/lib/auth/workspace";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession({ callbackUrl: "/dashboard" });
  const workspaces = await getUserWorkspaces();
  const activeWorkspace = workspaces.length
    ? await ensureActiveWorkspace(session)
    : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
              MABPS
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-zinc-600 sm:flex">
              <Link href="/dashboard" className="hover:text-zinc-900">
                Dashboard
              </Link>
              {activeWorkspace ? (
                <>
                  <Link href="/sites" className="hover:text-zinc-900">
                    Sites
                  </Link>
                  <Link href="/crm" className="hover:text-zinc-900">
                    CRM
                  </Link>
                  <Link href="/chatbot" className="hover:text-zinc-900">
                    Chatbot
                  </Link>
                  <Link href="/automations" className="hover:text-zinc-900">
                    Automations
                  </Link>
                  <Link
                    href="/settings/workspace"
                    className="hover:text-zinc-900"
                  >
                    Workspace
                  </Link>
                  <Link
                    href="/settings/workspace/billing"
                    className="hover:text-zinc-900"
                  >
                    Billing
                  </Link>
                </>
              ) : null}
              <Link href="/settings/account" className="hover:text-zinc-900">
                Account
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {workspaces.length ? (
              <WorkspaceSwitcher
                workspaces={workspaces}
                activeWorkspaceId={
                  activeWorkspace?.id ?? session.session.activeOrganizationId
                }
              />
            ) : null}
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-zinc-900">{session.user.name}</p>
              <p className="text-zinc-500">{session.user.email}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
