import { NextResponse } from "next/server";
import { requireAnalyticsMemberApi } from "@/lib/analytics/access";
import { analyticsErrorResponse } from "@/lib/analytics/http";
import { trackAiUsage } from "@/lib/analytics/repository";

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireAnalyticsMemberApi();
    const body = (await request.json()) as Record<string, unknown>;
    const provider =
      typeof body.provider === "string" ? body.provider.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";

    if (!provider || !model) {
      return NextResponse.json(
        { error: "provider and model are required." },
        { status: 400 },
      );
    }

    const usage = trackAiUsage({
      workspaceId: workspace.id,
      provider,
      model,
      operation:
        typeof body.operation === "string" ? body.operation : undefined,
      inputTokens:
        typeof body.inputTokens === "number" ? body.inputTokens : undefined,
      outputTokens:
        typeof body.outputTokens === "number" ? body.outputTokens : undefined,
      totalTokens:
        typeof body.totalTokens === "number" ? body.totalTokens : undefined,
      credits: typeof body.credits === "number" ? body.credits : undefined,
      success: typeof body.success === "boolean" ? body.success : undefined,
      entityType:
        typeof body.entityType === "string" ? body.entityType : null,
      entityId: typeof body.entityId === "string" ? body.entityId : null,
      userId:
        typeof body.userId === "string" ? body.userId : session.user.id,
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : {},
      occurredAt:
        typeof body.occurredAt === "string" ? body.occurredAt : undefined,
    });

    return NextResponse.json({ usage }, { status: 201 });
  } catch (error) {
    return analyticsErrorResponse(error);
  }
}
