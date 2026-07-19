import { EmailSubnav } from "@/components/email/email-subnav";
import { requireEmailWorkspace } from "@/lib/email-engine/access";
import { ensureWorkspaceEmail } from "@/lib/email-engine/repository";

export default async function EmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspace } = await requireEmailWorkspace("/email");
  ensureWorkspaceEmail(workspace.id);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <EmailSubnav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
