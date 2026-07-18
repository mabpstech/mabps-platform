import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse, parseListFilters } from "@/lib/crm/http";
import {
  getCustomerById,
  listCustomerTimeline,
} from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ customerId: string }> };

export async function GET(request: Request, context: RouteContext) {
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
    const filters = parseListFilters(new URL(request.url).searchParams);
    const timeline = listCustomerTimeline(workspace.id, customerId, filters);
    return NextResponse.json({ timeline });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
