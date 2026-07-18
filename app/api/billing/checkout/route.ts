import { NextResponse } from "next/server";
import { requireBillingManagerApi } from "@/lib/billing/access";
import { createCheckoutSession } from "@/lib/billing/checkout";
import { billingErrorResponse } from "@/lib/billing/http";
import {
  isBillingInterval,
  isPlanId,
  type BillingInterval,
  type PlanId,
} from "@/lib/billing/plans";

export async function POST(request: Request) {
  try {
    const { session, workspace } = await requireBillingManagerApi();
    const body = (await request.json()) as {
      planId?: string;
      interval?: string;
    };

    if (!body.planId || !isPlanId(body.planId) || body.planId === "free") {
      return NextResponse.json(
        { error: "A paid planId is required." },
        { status: 400 },
      );
    }
    if (!body.interval || !isBillingInterval(body.interval)) {
      return NextResponse.json(
        { error: "interval must be monthly or yearly." },
        { status: 400 },
      );
    }

    const result = await createCheckoutSession({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: session.user.email,
      planId: body.planId as PlanId,
      interval: body.interval as BillingInterval,
    });

    return NextResponse.json(result);
  } catch (error) {
    return billingErrorResponse(error);
  }
}
