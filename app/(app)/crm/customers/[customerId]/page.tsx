import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/crm/record-detail";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  getCustomerById,
  listCustomerTimeline,
  listNotes,
  listTags,
  listTagsForEntity,
} from "@/lib/crm/repository";

type PageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CrmCustomerPage({ params }: PageProps) {
  const { workspace } = await requireCrmWorkspace("/crm/customers");
  const { customerId } = await params;
  const customer = getCustomerById(customerId);
  if (!customer || customer.workspaceId !== workspace.id) notFound();

  return (
    <CustomerDetail
      customer={customer}
      notes={listNotes(workspace.id, {
        entityType: "customer",
        entityId: customerId,
      })}
      tags={listTagsForEntity(workspace.id, "customer", customerId)}
      allTags={listTags(workspace.id)}
      timeline={listCustomerTimeline(workspace.id, customerId, { limit: 100 })}
    />
  );
}
