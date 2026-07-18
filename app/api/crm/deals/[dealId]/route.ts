import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  deleteDeal,
  getDealById,
  listNotes,
  listTagsForEntity,
  updateDeal,
} from "@/lib/crm/repository";
import type { DealStatus } from "@/lib/crm/types";

type RouteContext = { params: Promise<{ dealId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { dealId } = await context.params;
    const deal = getDealById(dealId);
    if (!deal || deal.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    const notes = listNotes(workspace.id, { entityType: "deal", entityId: dealId });
    const tags = listTagsForEntity(workspace.id, "deal", dealId);
    return NextResponse.json({ deal, notes, tags });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const { dealId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const deal = updateDeal(
      dealId,
      workspace.id,
      {
        title: typeof body.title === "string" ? body.title : undefined,
        amountCents:
          typeof body.amountCents === "number" ? body.amountCents : undefined,
        currency: typeof body.currency === "string" ? body.currency : undefined,
        stageId: typeof body.stageId === "string" ? body.stageId : undefined,
        contactId:
          body.contactId === null || typeof body.contactId === "string"
            ? (body.contactId as string | null)
            : undefined,
        companyId:
          body.companyId === null || typeof body.companyId === "string"
            ? (body.companyId as string | null)
            : undefined,
        customerId:
          body.customerId === null || typeof body.customerId === "string"
            ? (body.customerId as string | null)
            : undefined,
        leadId:
          body.leadId === null || typeof body.leadId === "string"
            ? (body.leadId as string | null)
            : undefined,
        ownerUserId:
          body.ownerUserId === null || typeof body.ownerUserId === "string"
            ? (body.ownerUserId as string | null)
            : undefined,
        expectedCloseDate:
          body.expectedCloseDate === null ||
          typeof body.expectedCloseDate === "string"
            ? (body.expectedCloseDate as string | null)
            : undefined,
        description:
          body.description === null || typeof body.description === "string"
            ? (body.description as string | null)
            : undefined,
        status:
          typeof body.status === "string"
            ? (body.status as DealStatus)
            : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ deal });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { dealId } = await context.params;
    deleteDeal(dealId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
