import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createDeal, listDeals } from "@/lib/crm/repository";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const filters = parseListFilters(new URL(request.url).searchParams);
    const deals = listDeals(workspace.id, filters);
    return NextResponse.json({ deals });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Deal title is required." },
        { status: 400 },
      );
    }

    const deal = createDeal({
      workspaceId: workspace.id,
      title: body.title,
      pipelineId:
        typeof body.pipelineId === "string" ? body.pipelineId : undefined,
      stageId: typeof body.stageId === "string" ? body.stageId : undefined,
      amountCents:
        typeof body.amountCents === "number" ? body.amountCents : 0,
      currency: typeof body.currency === "string" ? body.currency : "USD",
      contactId: typeof body.contactId === "string" ? body.contactId : null,
      companyId: typeof body.companyId === "string" ? body.companyId : null,
      customerId: typeof body.customerId === "string" ? body.customerId : null,
      leadId: typeof body.leadId === "string" ? body.leadId : null,
      expectedCloseDate:
        typeof body.expectedCloseDate === "string"
          ? body.expectedCloseDate
          : null,
      description:
        typeof body.description === "string" ? body.description : null,
      ownerUserId:
        typeof body.ownerUserId === "string"
          ? body.ownerUserId
          : session.user.id,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ deal }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
