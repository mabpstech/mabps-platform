import { notFound } from "next/navigation";
import { DealDetail } from "@/components/crm/record-detail";
import { requireCrmWorkspace } from "@/lib/crm/access";
import {
  getDealById,
  listCustomers,
  listNotes,
  listPipelineStages,
  listTags,
  listTagsForEntity,
} from "@/lib/crm/repository";

type PageProps = {
  params: Promise<{ dealId: string }>;
};

export default async function CrmDealPage({ params }: PageProps) {
  const { workspace } = await requireCrmWorkspace("/crm/deals");
  const { dealId } = await params;
  const deal = getDealById(dealId);
  if (!deal || deal.workspaceId !== workspace.id) notFound();

  return (
    <DealDetail
      deal={deal}
      notes={listNotes(workspace.id, { entityType: "deal", entityId: dealId })}
      tags={listTagsForEntity(workspace.id, "deal", dealId)}
      allTags={listTags(workspace.id)}
      stages={listPipelineStages(deal.pipelineId)}
      customers={listCustomers(workspace.id, { limit: 500 })}
    />
  );
}
