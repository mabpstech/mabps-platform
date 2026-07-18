import { ImportExportPanel } from "@/components/crm/import-export-panel";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";

export default async function CrmImportExportPage() {
  const { role } = await requireCrmWorkspace("/crm/import-export");
  return <ImportExportPanel canImport={isWorkspaceManager(role)} />;
}
