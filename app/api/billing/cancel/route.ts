import { NextResponse } from "next/server";
import { requireBillingManagerApi } from "@/lib/billing/access";
import {
  cancelWorkspaceSubscription,
  resumeWorkspaceSubscription,
} from "@/lib/billing/cancel";
import { billingErrorResponse } from "@/lib/billing/http";

export async function POST(request: Request) {
  try {
    const { workspace } = await requireBillingManagerApi();
    const body = (await request.json().catch(() => ({}))) as {
      immediate?: boolean;
      resume?: boolean;
    };

    if (body.resume) {
      await resumeWorkspaceSubscription(workspace.id);
      return NextResponse.json({ ok: true, resumed: true });
    }

    await cancelWorkspaceSubscription({
      workspaceId: workspace.id,
      immediate: Boolean(body.immediate),
    });

    return NextResponse.json({ ok: true, canceled: true });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
