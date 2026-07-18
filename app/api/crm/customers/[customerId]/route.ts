import { NextResponse } from "next/server";
import { requireCrmManagerApi, requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import {
  deleteCustomer,
  getCustomerById,
  listCustomerTimeline,
  listNotes,
  listTagsForEntity,
  updateCustomer,
} from "@/lib/crm/repository";
import type {
  CustomerLifecycleStage,
  CustomerStatus,
} from "@/lib/crm/types";

type RouteContext = { params: Promise<{ customerId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const { customerId } = await context.params;
    const customer = getCustomerById(customerId);
    if (!customer || customer.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }
    const notes = listNotes(workspace.id, {
      entityType: "customer",
      entityId: customerId,
    });
    const tags = listTagsForEntity(workspace.id, "customer", customerId);
    const timeline = listCustomerTimeline(workspace.id, customerId, {
      limit: 50,
    });
    return NextResponse.json({ customer, notes, tags, timeline });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const { customerId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const customer = updateCustomer(
      customerId,
      workspace.id,
      {
        displayName:
          typeof body.displayName === "string" ? body.displayName : undefined,
        email:
          body.email === null || typeof body.email === "string"
            ? (body.email as string | null)
            : undefined,
        phone:
          body.phone === null || typeof body.phone === "string"
            ? (body.phone as string | null)
            : undefined,
        contactId:
          body.contactId === null || typeof body.contactId === "string"
            ? (body.contactId as string | null)
            : undefined,
        companyId:
          body.companyId === null || typeof body.companyId === "string"
            ? (body.companyId as string | null)
            : undefined,
        status:
          typeof body.status === "string"
            ? (body.status as CustomerStatus)
            : undefined,
        lifecycleStage:
          typeof body.lifecycleStage === "string"
            ? (body.lifecycleStage as CustomerLifecycleStage)
            : undefined,
        ownerUserId:
          body.ownerUserId === null || typeof body.ownerUserId === "string"
            ? (body.ownerUserId as string | null)
            : undefined,
        acquiredAt:
          body.acquiredAt === null || typeof body.acquiredAt === "string"
            ? (body.acquiredAt as string | null)
            : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ customer });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { workspace } = await requireCrmManagerApi();
    const { customerId } = await context.params;
    deleteCustomer(customerId, workspace.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
