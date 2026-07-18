import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { convertLead } from "@/lib/crm/repository";

type RouteContext = { params: Promise<{ leadId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const { leadId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const result = convertLead({
      leadId,
      workspaceId: workspace.id,
      actorUserId: session.user.id,
      createDeal: body.createDeal === true,
      dealTitle: typeof body.dealTitle === "string" ? body.dealTitle : undefined,
      dealAmountCents:
        typeof body.dealAmountCents === "number"
          ? body.dealAmountCents
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return crmErrorResponse(error);
  }
}
