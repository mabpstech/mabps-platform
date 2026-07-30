import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import { getSiteById, getThemeBySiteId } from "@/lib/website/repository";

const ThemeStudio = dynamic(
  () =>
    import("@/components/website/theme/theme-studio").then(
      (mod) => mod.ThemeStudio,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-zinc-500">
        Loading theme studio…
      </div>
    ),
  },
);

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteThemePage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  const theme = getThemeBySiteId(siteId);
  if (!site || !theme || site.workspaceId !== workspace.id) notFound();

  return (
    <ThemeStudio
      siteId={siteId}
      theme={theme}
      siteName={site.name}
      canManage={isWorkspaceManager(role)}
    />
  );
}
