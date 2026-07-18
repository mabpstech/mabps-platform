import { notFound } from "next/navigation";
import { FormsManager } from "@/components/website/forms-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getFormWithFields,
  getSiteById,
  listForms,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteFormsPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/sites");
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.workspaceId !== workspace.id) notFound();

  const forms = listForms(siteId)
    .map((form) => getFormWithFields(form.id))
    .filter((form): form is NonNullable<typeof form> => Boolean(form));

  return (
    <FormsManager
      siteId={siteId}
      forms={forms}
      canManage={isWorkspaceManager(role)}
    />
  );
}
