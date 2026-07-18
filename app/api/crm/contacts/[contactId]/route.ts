import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  deleteContact,
  getContactById,
  listNotes,
  listTagsForEntity,
  updateContact,
} from "@/lib/crm/repository";
import type { ContactStatus } from "@/lib/crm/types";

type RouteContext = { params: Promise<{ contactId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { contactId } = await context.params;
    const contact = getContactById(contactId);
    if (!contact || contact.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }
    const notes = listNotes(workspace.id, {
      entityType: "contact",
      entityId: contactId,
    });
    const tags = listTagsForEntity(workspace.id, "contact", contactId);
    return NextResponse.json({ contact, notes, tags });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { contactId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const contact = updateContact(contactId, workspace.id, {
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      email: body.email === null || typeof body.email === "string" ? (body.email as string | null) : undefined,
      phone: body.phone === null || typeof body.phone === "string" ? (body.phone as string | null) : undefined,
      jobTitle: body.jobTitle === null || typeof body.jobTitle === "string" ? (body.jobTitle as string | null) : undefined,
      companyId: body.companyId === null || typeof body.companyId === "string" ? (body.companyId as string | null) : undefined,
      status: typeof body.status === "string" ? (body.status as ContactStatus) : undefined,
      ownerUserId: body.ownerUserId === null || typeof body.ownerUserId === "string" ? (body.ownerUserId as string | null) : undefined,
    });
    return NextResponse.json({ contact });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { contactId } = await context.params;
    deleteContact(contactId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
