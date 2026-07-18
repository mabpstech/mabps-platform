import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/analytics/dashboard-home";
import { getAnalyticsOverview } from "@/lib/analytics/repository";
import { requireSession } from "@/lib/auth/session";
import { ensureActiveWorkspace } from "@/lib/auth/workspace";

export default async function DashboardPage() {
  const session = await requireSession({ callbackUrl: "/dashboard" });
  const workspace = await ensureActiveWorkspace(session);

  if (!workspace) {
    redirect("/onboarding");
  }

  const overview = getAnalyticsOverview(workspace.id, "30d");

  return (
    <DashboardHome
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      userEmail={session.user.email}
      overview={overview}
    />
  );
}
