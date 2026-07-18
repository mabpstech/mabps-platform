import { NextResponse } from "next/server";
import { requireCrmMemberApi } from "@/lib/crm/access";
import { crmErrorResponse } from "@/lib/crm/http";
import { assignTag } from "@/lib/crm/repository";
import type { CrmEntityType } from "@/lib/crm/types";

type RouteContext = { params: Promise<{ tagId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireCrmMemberApi();
    const { tagId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.entityType !== "string" || typeof body.entityId !== "string") {
      return NextResponse.json(
        { error: "entityType and entityId are required." },
        { status: 400 },
      );
    }

    assignTag({
      workspaceId: workspace.id,
      tagId,
      entityType: body.entityType as CrmEntityType,
      entityId: body.entityId,
      actorUserId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return crmErrorResponse(error);
  }
}
