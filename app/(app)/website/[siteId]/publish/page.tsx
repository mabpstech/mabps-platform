import { notFound } from "next/navigation";
import {
  PublishPanel,
  type PublishChecklistItem,
} from "@/components/website/publish-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getPublishHistory } from "@/lib/website/publish";
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
  const siteId = bundle.site.id;
  const home = bundle.pages.find((page) => page.pageType === "home");
  const heroExists = home
    ? listSections(home.id).some((section) => section.type === "hero")
    : false;
  const logoUploaded = Boolean(
    bundle.theme.logoMediaId ||
      bundle.header.logoMediaId ||
      bundle.theme.tokens.brand.logoMediaId,
  );
  const faviconSet = Boolean(
    bundle.theme.faviconMediaId || bundle.theme.tokens.brand.faviconMediaId,
  );
  const draftPages = bundle.pages.filter((page) => page.status !== "published");
  const pagesHref = `/website/${siteId}/pages`;
  const homeHref = home
    ? `/website/${siteId}/pages/${home.id}`
    : pagesHref;

  return [
    {
      id: "name",
      label: "Website name exists",
      ok: Boolean(bundle.site.name?.trim()),
      required: true,
      href: `/website/${siteId}`,
    },
    {
      id: "homepage",
      label: "Homepage exists",
      ok: Boolean(home),
      required: true,
      href: pagesHref,
    },
    {
      id: "homePublished",
      label: "Homepage is published (not draft)",
      ok: Boolean(home && home.status === "published"),
      required: true,
      href: homeHref,
    },
    {
      id: "navigation",
      label: "Navigation configured",
      ok: bundle.navigation.length > 0,
      href: `/website/${siteId}/navigation`,
    },
    {
      id: "pagesPublished",
      label:
        draftPages.length === 0
          ? "All pages published"
          : `${draftPages.length} draft page${draftPages.length === 1 ? "" : "s"} will stay private`,
      ok: draftPages.length === 0,
      href: pagesHref,
    },
    {
      id: "seoTitle",
      label: "SEO title present",
      ok: Boolean(bundle.seo.defaultTitle?.trim()),
      href: `/website/${siteId}/seo`,
    },
    {
      id: "seoDescription",
      label: "SEO description present",
      ok: Boolean(bundle.seo.defaultDescription?.trim()),
      href: `/website/${siteId}/seo`,
    },
    {
      id: "favicon",
      label: "Favicon set",
      ok: faviconSet,
      href: `/website/${siteId}/theme`,
    },
    {
      id: "logo",
      label: "Logo uploaded",
      ok: logoUploaded,
      href: `/website/${siteId}/theme`,
    },
    {
      id: "hero",
      label: "Hero section exists",
      ok: heroExists,
      href: homeHref,
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
      initialEvents={getPublishHistory(siteId, 30)}
    />
  );
}
