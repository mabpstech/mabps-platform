import { AutomationSubnav } from "@/components/automation/automation-subnav";
import { requireAutomationWorkspace } from "@/lib/automation/access";
import { ensureAutomationReady } from "@/lib/automation/repository";

export default async function AutomationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAutomationWorkspace("/automations");
  ensureAutomationReady();

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <AutomationSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
