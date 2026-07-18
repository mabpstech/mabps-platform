import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import { createCustomer, listCustomers } from "@/lib/crm/repository";
import type {
  CustomerLifecycleStage,
  CustomerStatus,
} from "@/lib/crm/types";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireCrmMemberApi();
    const filters = parseListFilters(new URL(request.url).searchParams);
    const customers = listCustomers(workspace.id, filters);
    return NextResponse.json({ customers });
  } catch (error) {
    return crmErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.displayName !== "string" || !body.displayName.trim()) {
      return NextResponse.json(
        { error: "Customer name is required." },
        { status: 400 },
      );
    }

    const customer = createCustomer({
      workspaceId: workspace.id,
      displayName: body.displayName,
      email: typeof body.email === "string" ? body.email : null,
      phone: typeof body.phone === "string" ? body.phone : null,
      contactId: typeof body.contactId === "string" ? body.contactId : null,
      companyId: typeof body.companyId === "string" ? body.companyId : null,
      status:
        typeof body.status === "string"
          ? (body.status as CustomerStatus)
          : "active",
      lifecycleStage:
        typeof body.lifecycleStage === "string"
          ? (body.lifecycleStage as CustomerLifecycleStage)
          : "customer",
      ownerUserId:
        typeof body.ownerUserId === "string"
          ? body.ownerUserId
          : session.user.id,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
