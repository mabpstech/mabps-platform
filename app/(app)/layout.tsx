import Link from "next/link";
import { GlobalNav } from "@/components/app/global-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { WorkspaceSwitcher } from "@/components/auth/workspace-switcher";
import { requireSession } from "@/lib/auth/session";
import {
  ensureActiveWorkspace,
  getUserWorkspaces,
} from "@/lib/auth/workspace";

const CORE_NAV = [
  { href: "/dashboard", label: "Dashboard" },
] as const;

const WORKSPACE_NAV = [
  { href: "/analytics", label: "Analytics" },
  { href: "/website", label: "Website" },
  { href: "/crm", label: "CRM" },
  { href: "/ai", label: "AI" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/email", label: "Email" },
  { href: "/notifications", label: "Notifications" },
  { href: "/deployment", label: "Deployment" },
  { href: "/guardian", label: "Guardian" },
  { href: "/chatbot", label: "Chatbot" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/memory", label: "Memory" },
  { href: "/automation", label: "Automation" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/workspace/billing", label: "Billing" },
] as const;

const ACCOUNT_NAV = [
  { href: "/settings/account", label: "Account" },
] as const;

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

  const navItems = [
    ...CORE_NAV,
    ...(activeWorkspace ? WORKSPACE_NAV : []),
    ...ACCOUNT_NAV,
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              href="/dashboard"
              className="shrink-0 text-lg font-semibold tracking-tight text-zinc-900 transition-opacity duration-200 hover:opacity-70"
            >
              MABPS
            </Link>
            <GlobalNav items={[...navItems]} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
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
