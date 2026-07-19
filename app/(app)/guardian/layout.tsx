import { GuardianSubnav } from "@/components/guardian/guardian-subnav";
import { requireGuardianWorkspace } from "@/lib/guardian/access";
import { ensureWorkspaceGuardian } from "@/lib/guardian/repository";

export default async function GuardianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireGuardianWorkspace("/guardian");
  ensureWorkspaceGuardian(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <GuardianSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
