import { NextResponse } from "next/server";
import { requireBillingManagerApi } from "@/lib/billing/access";
import { billingErrorResponse } from "@/lib/billing/http";
import { createBillingPortalSession } from "@/lib/billing/portal";

export async function POST() {
  try {
    const { session, workspace } = await requireBillingManagerApi();
    const result = await createBillingPortalSession({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: session.user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    return billingErrorResponse(error);
  }
}
