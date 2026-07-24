import { NextResponse } from "next/server";
import { requireBillingManagerApi } from "@/lib/billing/access";
import { billingService } from "@/lib/billing/engine/create-service";
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

    const result = await billingService.applyPlanChange({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      email: session.user.email,
      targetPlanId: body.planId as PlanId,
      targetInterval: body.interval as BillingInterval,
    });

    if (!result.checkoutUrl) {
      return NextResponse.json(
        { error: "Checkout URL was not returned." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: result.checkoutUrl,
      subscriptionId: result.subscriptionId,
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
