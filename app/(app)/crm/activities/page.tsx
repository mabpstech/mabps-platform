import { ActivitiesManager } from "@/components/crm/activities-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listActivities, listCustomers } from "@/lib/crm/repository";

export default async function CrmActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/activities");
  const params = await searchParams;

  const activities = listActivities(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    type: typeof params.type === "string" ? params.type : undefined,
    limit: 200,
  });

  return (
    <ActivitiesManager
      activities={activities}
      customers={listCustomers(workspace.id, { limit: 500 })}
      canManage={isWorkspaceManager(role)}
    />
  );
}
