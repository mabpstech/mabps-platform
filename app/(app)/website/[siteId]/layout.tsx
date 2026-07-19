import { notFound } from "next/navigation";
import { SiteSubnav } from "@/components/website/site-subnav";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById } from "@/lib/website/repository";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ siteId: string }>;
};

export default async function SiteLayout({ children, params }: LayoutProps) {
  const { workspace } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <SiteSubnav siteId={site.id} siteName={site.name} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
