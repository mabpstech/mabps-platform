import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  deleteCompany,
  getCompanyById,
  listNotes,
  listTagsForEntity,
  updateCompany,
} from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { companyId } = await context.params;
    const company = getCompanyById(companyId);
    if (!company || company.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Company not found." }, { status: 404 });
    }
    const notes = listNotes(workspace.id, {
      entityType: "company",
      entityId: companyId,
    });
    const tags = listTagsForEntity(workspace.id, "company", companyId);
    return NextResponse.json({ company, notes, tags });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { companyId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const company = updateCompany(companyId, workspace.id, {
      name: typeof body.name === "string" ? body.name : undefined,
      domain: body.domain === null || typeof body.domain === "string" ? (body.domain as string | null) : undefined,
      industry: body.industry === null || typeof body.industry === "string" ? (body.industry as string | null) : undefined,
      phone: body.phone === null || typeof body.phone === "string" ? (body.phone as string | null) : undefined,
      email: body.email === null || typeof body.email === "string" ? (body.email as string | null) : undefined,
      website: body.website === null || typeof body.website === "string" ? (body.website as string | null) : undefined,
      address: body.address === null || typeof body.address === "string" ? (body.address as string | null) : undefined,
      city: body.city === null || typeof body.city === "string" ? (body.city as string | null) : undefined,
      state: body.state === null || typeof body.state === "string" ? (body.state as string | null) : undefined,
      country: body.country === null || typeof body.country === "string" ? (body.country as string | null) : undefined,
      postalCode: body.postalCode === null || typeof body.postalCode === "string" ? (body.postalCode as string | null) : undefined,
      description: body.description === null || typeof body.description === "string" ? (body.description as string | null) : undefined,
      ownerUserId: body.ownerUserId === null || typeof body.ownerUserId === "string" ? (body.ownerUserId as string | null) : undefined,
    });
    return NextResponse.json({ company });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { companyId } = await context.params;
    deleteCompany(companyId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
