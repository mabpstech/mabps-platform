import { notFound } from "next/navigation";
import { FormEditor } from "@/components/website/form-editor";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireWebsiteWorkspace } from "@/lib/website/access";
import {
  getFormWithFields,
  getSiteById,
  listFormSubmissions,
} from "@/lib/website/repository";

type PageProps = {
  params: Promise<{ siteId: string; formId: string }>;
};

export default async function SiteFormEditorPage({ params }: PageProps) {
  const { workspace, role } = await requireWebsiteWorkspace("/website");
  const { siteId, formId } = await params;
  const site = getSiteById(siteId);
  const form = getFormWithFields(formId);
  if (!site || !form || site.workspaceId !== workspace.id || form.siteId !== siteId) {
    notFound();
  }

  return (
    <FormEditor
      siteId={siteId}
      form={form}
      submissions={listFormSubmissions(formId)}
      canManage={isWorkspaceManager(role)}
    />
  );
}
