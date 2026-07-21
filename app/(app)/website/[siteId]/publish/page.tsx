import { notFound } from "next/navigation";
import {
  PublishPanel,
  type PublishChecklistItem,
} from "@/components/website/publish-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getSiteBundle,
  listSections,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

function buildChecklist(
  bundle: NonNullable<ReturnType<typeof getSiteBundle>>,
): PublishChecklistItem[] {
  const home = bundle.pages.find((page) => page.pageType === "home");
  const heroExists = home
    ? listSections(home.id).some((section) => section.type === "hero")
    : false;
  const logoUploaded = Boolean(
    bundle.theme.logoMediaId || bundle.header.logoMediaId,
  );

  return [
    {
      id: "name",
      label: "Website name exists",
      ok: Boolean(bundle.site.name?.trim()),
    },
    {
      id: "homepage",
      label: "Homepage exists",
      ok: Boolean(home),
    },
    {
      id: "navigation",
      label: "Navigation configured",
      ok: bundle.navigation.length > 0,
    },
    {
      id: "seoTitle",
      label: "SEO title present",
      ok: Boolean(bundle.seo.defaultTitle?.trim()),
    },
    {
      id: "seoDescription",
      label: "SEO description present",
      ok: Boolean(bundle.seo.defaultDescription?.trim()),
    },
    {
      id: "favicon",
      label: "Favicon set",
      ok: Boolean(bundle.theme.faviconMediaId),
    },
    {
      id: "logo",
      label: "Logo uploaded",
      ok: logoUploaded,
    },
    {
      id: "hero",
      label: "Hero section exists",
      ok: heroExists,
    },
  ];
}

export default async function SitePublishPage({ params }: PageProps) {
  const { workspace, role, session } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const bundle = getSiteBundle(siteId);
  if (!bundle || bundle.site.workspaceId !== workspace.id) notFound();

  return (
    <PublishPanel
      site={bundle.site}
      canManage={isWorkspaceManager(role)}
      checklist={buildChecklist(bundle)}
      publisherName={session.user.name || session.user.email || "Workspace member"}
    />
  );
}
