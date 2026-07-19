import { sendWorkspaceEmail } from "@/lib/email-engine/engine/send";
import { ensureWorkspaceEmail } from "@/lib/email-engine/repository";
import type {
  EmailAutomationProvider,
  EmailAutomationProviderConfig,
  EmailProviderSendInput,
  EmailProviderSendResult,
} from "@/lib/automation/providers/email/types";

type RuntimeConfig = EmailAutomationProviderConfig & { workspaceId?: string };

/**
 * Workspace Email Engine provider for Automation `email.send`.
 */
export const workspaceEmailProvider: EmailAutomationProvider = {
  id: "email_engine",
  isImplemented: true,
  async sendEmail(
    config: RuntimeConfig,
    input: EmailProviderSendInput,
  ): Promise<EmailProviderSendResult> {
    try {
      if (!config.workspaceId) {
        return {
          ok: false,
          error: "email.send requires workspaceId.",
        };
      }

      ensureWorkspaceEmail(config.workspaceId);
      const message = await sendWorkspaceEmail(config.workspaceId, {
        to: input.to,
        toName: input.toName,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
        templateId: input.templateId,
        variables: input.variables,
        kind: input.kind || "transactional",
        metadata: input.metadata,
      });

      if (message.status === "failed") {
        return {
          ok: false,
          error: message.errorMessage || "Email send failed.",
          messageId: message.id,
          raw: message.raw,
        };
      }

      return {
        ok: true,
        providerMessageId: message.providerMessageId || undefined,
        messageId: message.id,
        raw: message.raw,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Email send failed.",
      };
    }
  },
};

const providers: Record<string, EmailAutomationProvider> = {
  email_engine: workspaceEmailProvider,
};

export function getEmailProvider(id = "email_engine"): EmailAutomationProvider {
  return providers[id] ?? workspaceEmailProvider;
}

export type {
  EmailAutomationProvider,
  EmailAutomationProviderConfig,
  EmailProviderSendInput,
  EmailProviderSendResult,
};
