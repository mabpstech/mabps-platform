import { TasksManager } from "@/components/crm/tasks-manager";
import { isWorkspaceManager } from "@/lib/auth/permissions";
import { requireCrmWorkspace } from "@/lib/crm/access";
import { listTasks } from "@/lib/crm/repository";

export default async function CrmTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace, role } = await requireCrmWorkspace("/crm/tasks");
  const params = await searchParams;

  const tasks = listTasks(workspace.id, {
    q: typeof params.q === "string" ? params.q : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    priority: typeof params.priority === "string" ? params.priority : undefined,
    limit: 200,
  });

  return (
    <TasksManager tasks={tasks} canManage={isWorkspaceManager(role)} />
  );
}
