import { NextResponse } from "next/server";
import { requireBillingMemberApi } from "@/lib/billing/access";
import { billingErrorResponse } from "@/lib/billing/http";
import { ensureFreeSubscription } from "@/lib/billing/repository";

/**
 * Ensure the active workspace has a Free subscription row.
 * Called after workspace creation / first load.
 */
export async function POST() {
  try {
    const { workspace } = await requireBillingMemberApi();
    const subscription = ensureFreeSubscription(workspace.id);
    return NextResponse.json({ subscription });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
