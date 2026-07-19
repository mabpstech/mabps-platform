import { sendMarketingEmail } from "@/lib/email-engine/engine/send";
import {
  renderEmailTemplate,
  resolveEmailTemplate,
} from "@/lib/email-engine/engine/templates";
import {
  createEmailLog,
  getCampaignById,
  listCampaignRecipients,
  updateCampaign,
  updateCampaignRecipient,
} from "@/lib/email-engine/repository";
import type { EmailCampaign } from "@/lib/email-engine/types";

/**
 * Send a draft/scheduled marketing campaign to all pending recipients.
 */
export async function runEmailCampaign(input: {
  workspaceId: string;
  campaignId: string;
}): Promise<EmailCampaign> {
  const campaign = getCampaignById(input.campaignId);
  if (!campaign || campaign.workspaceId !== input.workspaceId) {
    throw new Error("Campaign not found.");
  }
  if (campaign.status === "sending") {
    throw new Error("Campaign is already sending.");
  }
  if (campaign.status === "completed") {
    throw new Error("Campaign already completed.");
  }

  let subject = campaign.subject;
  let html = campaign.html || "";
  let text = campaign.text || "";

  if (campaign.templateId) {
    const template = resolveEmailTemplate({
      workspaceId: input.workspaceId,
      templateId: campaign.templateId,
    });
    if (template) {
      const rendered = renderEmailTemplate(template);
      subject = subject || rendered.subject;
      html = html || rendered.html;
      text = text || rendered.text;
    }
  }

  if (!html && !text) {
    throw new Error("Campaign has no HTML or text body.");
  }

  const startedAt = new Date().toISOString();
  updateCampaign(campaign.id, input.workspaceId, {
    status: "sending",
    startedAt,
  });

  const recipients = listCampaignRecipients(campaign.id, input.workspaceId);
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    if (recipient.status === "sent") {
      sentCount += 1;
      continue;
    }
    if (recipient.status === "skipped") continue;

    try {
      const message = await sendMarketingEmail(input.workspaceId, {
        to: recipient.email,
        toName: recipient.name,
        subject,
        html,
        text,
        templateId: campaign.templateId,
        campaignId: campaign.id,
        variables: {
          email: recipient.email,
          name: recipient.name || "",
        },
      });

      updateCampaignRecipient(recipient.id, input.workspaceId, {
        status: message.status === "failed" ? "failed" : "sent",
        messageId: message.id,
        providerMessageId: message.providerMessageId,
        errorMessage: message.errorMessage,
        sentAt: new Date().toISOString(),
      });
      if (message.status === "failed") failedCount += 1;
      else sentCount += 1;
    } catch (error) {
      failedCount += 1;
      updateCampaignRecipient(recipient.id, input.workspaceId, {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Campaign send failed.",
        sentAt: new Date().toISOString(),
      });
    }
  }

  const completed = updateCampaign(campaign.id, input.workspaceId, {
    status: failedCount > 0 && sentCount === 0 ? "failed" : "completed",
    sentCount,
    failedCount,
    completedAt: new Date().toISOString(),
  });

  createEmailLog({
    workspaceId: input.workspaceId,
    operation: "campaign_send",
    status: completed.status === "failed" ? "error" : "success",
    campaignId: campaign.id,
    requestSummary: `${campaign.name}: ${sentCount} sent, ${failedCount} failed`,
    metadata: { campaignId: campaign.id },
  });

  return completed;
}
