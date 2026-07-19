import { DeploymentSubnav } from "@/components/deployment/deployment-subnav";
import { requireDeploymentWorkspace } from "@/lib/deployment/access";
import { ensureWorkspaceDeployment } from "@/lib/deployment/repository";

export default async function DeploymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireDeploymentWorkspace("/deployment");
  ensureWorkspaceDeployment(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <DeploymentSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
