import { NextResponse } from "next/server";
import { requireBillingMemberApi } from "@/lib/billing/access";
import {
  getWorkspaceLimits,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import { billingErrorResponse } from "@/lib/billing/http";
import { getPlan } from "@/lib/billing/plans";

export async function GET() {
  try {
    const { workspace, subscription } = await requireBillingMemberApi();
    const plan = getPlan(subscription.planId);

    return NextResponse.json({
      subscription,
      plan,
      limits: getWorkspaceLimits(workspace.id),
      usage: getWorkspaceUsage(workspace.id),
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
