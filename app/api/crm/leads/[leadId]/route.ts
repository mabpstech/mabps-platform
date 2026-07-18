import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  deleteLead,
  getLeadById,
  listNotes,
  listTagsForEntity,
  updateLead,
} from "@/lib/crm/repository";
import type { LeadSource, LeadStatus } from "@/lib/crm/types";

type RouteContext = { params: Promise<{ leadId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { leadId } = await context.params;
    const lead = getLeadById(leadId);
    if (!lead || lead.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    const notes = listNotes(workspace.id, { entityType: "lead", entityId: leadId });
    const tags = listTagsForEntity(workspace.id, "lead", leadId);
    return NextResponse.json({ lead, notes, tags });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { leadId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const lead = updateLead(leadId, workspace.id, {
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      email: body.email === null || typeof body.email === "string" ? (body.email as string | null) : undefined,
      phone: body.phone === null || typeof body.phone === "string" ? (body.phone as string | null) : undefined,
      companyName: body.companyName === null || typeof body.companyName === "string" ? (body.companyName as string | null) : undefined,
      jobTitle: body.jobTitle === null || typeof body.jobTitle === "string" ? (body.jobTitle as string | null) : undefined,
      companyId: body.companyId === null || typeof body.companyId === "string" ? (body.companyId as string | null) : undefined,
      contactId: body.contactId === null || typeof body.contactId === "string" ? (body.contactId as string | null) : undefined,
      source: typeof body.source === "string" ? (body.source as LeadSource) : undefined,
      status: typeof body.status === "string" ? (body.status as LeadStatus) : undefined,
      score: typeof body.score === "number" ? body.score : undefined,
      ownerUserId: body.ownerUserId === null || typeof body.ownerUserId === "string" ? (body.ownerUserId as string | null) : undefined,
    });
    return NextResponse.json({ lead });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { leadId } = await context.params;
    deleteLead(leadId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
