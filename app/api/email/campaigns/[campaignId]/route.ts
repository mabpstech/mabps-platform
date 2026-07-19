import { NextResponse } from "next/server";
import {
  requireEmailManagerApi,
  requireEmailMemberApi,
} from "@/lib/email-engine/access";
import { runEmailCampaign } from "@/lib/email-engine/engine/campaigns";
import { emailErrorResponse } from "@/lib/email-engine/http";
import {
  getCampaignById,
  listCampaignRecipients,
} from "@/lib/email-engine/repository";

type Params = { params: Promise<{ campaignId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { workspace } = await requireEmailMemberApi();
    const { campaignId } = await params;
    const campaign = getCampaignById(campaignId);
    if (!campaign || campaign.workspaceId !== workspace.id) {
      throw new Error("Campaign not found.");
    }
    return NextResponse.json({
      campaign,
      recipients: listCampaignRecipients(campaignId, workspace.id),
    });
  } catch (error) {
    return emailErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { workspace } = await requireEmailManagerApi();
    const { campaignId } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action !== "send") {
      throw new Error("Unsupported action. Use action=send.");
    }

    const campaign = await runEmailCampaign({
      workspaceId: workspace.id,
      campaignId,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    return emailErrorResponse(error);
  }
}
