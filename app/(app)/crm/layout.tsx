import { CrmSubnav } from "@/components/crm/crm-subnav";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { ensureWorkspaceCrm } from "@/lib/crm/repository";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireCrmWorkspace("/crm");
  ensureWorkspaceCrm(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <CrmSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
