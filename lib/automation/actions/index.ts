import { resolveValue } from "@/lib/automation/engine/templates";
import { getWhatsAppProvider } from "@/lib/automation/providers/whatsapp";
import type {
  ActionExecutionContext,
  AutomationAction,
} from "@/lib/automation/actions/types";
import type { ActionResult, ActionType } from "@/lib/automation/types";
import { sendEmail } from "@/lib/email";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

const emailSend: AutomationAction = {
  id: "email.send",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const to = asString(resolved.to).trim();
    const subject = asString(resolved.subject).trim();
    const text = asString(resolved.text);
    const html = asString(resolved.html) || `<p>${text}</p>`;
    if (!to || !subject) {
      return { ok: false, error: "email.send requires to and subject." };
    }
    await sendEmail({ to, subject, text: text || subject, html });
    return { ok: true, output: { to, subject } };
  },
};

const whatsappSend: AutomationAction = {
  id: "whatsapp.send",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const provider = getWhatsAppProvider(
      asString(resolved.provider, "meta_cloud"),
    );
    const result = await provider.sendMessage(
      {
        phoneNumberId: asString(resolved.phoneNumberId) || undefined,
        accessToken: asString(resolved.accessToken) || undefined,
        wabaId: asString(resolved.wabaId) || undefined,
      },
      {
        to: asString(resolved.to),
        message: asString(resolved.message),
        templateName: asString(resolved.templateName) || undefined,
      },
    );
    if (!result.ok) {
      return {
        ok: false,
        error: result.error || "WhatsApp send failed.",
        output: result.raw,
      };
    }
    return {
      ok: true,
      output: {
        providerMessageId: result.providerMessageId,
        ...result.raw,
      },
    };
  },
};

const webhookHttp: AutomationAction = {
  id: "webhook.http_request",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const url = asString(resolved.url).trim();
    if (!url) return { ok: false, error: "webhook.http_request requires url." };
    const method = asString(resolved.method, "POST").toUpperCase();
    const headers =
      resolved.headers && typeof resolved.headers === "object"
        ? (resolved.headers as Record<string, string>)
        : { "Content-Type": "application/json" };
    const body =
      resolved.body === undefined
        ? undefined
        : typeof resolved.body === "string"
          ? resolved.body
          : JSON.stringify(resolved.body);

    const response = await fetch(url, { method, headers, body });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* keep text */
    }
    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
        output: { status: response.status, body: parsed },
      };
    }
    return {
      ok: true,
      output: { status: response.status, body: parsed },
    };
  },
};

async function crmCreateLead(
  ctx: ActionExecutionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  const { createLead } = await import("@/lib/crm/repository");
  const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
  const firstName = asString(resolved.firstName).trim();
  if (!firstName) return { ok: false, error: "crm.create_lead requires firstName." };
  const lead = createLead({
    workspaceId: ctx.workspaceId,
    firstName,
    lastName: asString(resolved.lastName) || undefined,
    email: asString(resolved.email) || null,
    phone: asString(resolved.phone) || null,
    companyName: asString(resolved.companyName) || null,
    source: "manual",
  });
  return { ok: true, output: { leadId: lead.id, lead } };
}

async function crmUpdateLead(
  ctx: ActionExecutionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  const { updateLead } = await import("@/lib/crm/repository");
  const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
  const leadId = asString(resolved.leadId).trim();
  if (!leadId) return { ok: false, error: "crm.update_lead requires leadId." };
  const lead = updateLead(leadId, ctx.workspaceId, {
    firstName: asString(resolved.firstName) || undefined,
    lastName: asString(resolved.lastName) || undefined,
    email: resolved.email === undefined ? undefined : asString(resolved.email) || null,
    phone: resolved.phone === undefined ? undefined : asString(resolved.phone) || null,
    status:
      typeof resolved.status === "string"
        ? (resolved.status as never)
        : undefined,
  });
  return { ok: true, output: { leadId: lead.id, lead } };
}

async function crmCreateTask(
  ctx: ActionExecutionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  const { createTask } = await import("@/lib/crm/repository");
  const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
  const title = asString(resolved.title).trim();
  if (!title) return { ok: false, error: "crm.create_task requires title." };
  const task = createTask({
    workspaceId: ctx.workspaceId,
    title,
    description: asString(resolved.description) || null,
    dueAt: asString(resolved.dueAt) || null,
    priority:
      typeof resolved.priority === "string"
        ? (resolved.priority as never)
        : undefined,
  });
  return { ok: true, output: { taskId: task.id, task } };
}

async function crmCreateActivity(
  ctx: ActionExecutionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  const { createActivity } = await import("@/lib/crm/repository");
  const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
  const subject = asString(resolved.subject || resolved.summary || resolved.title).trim();
  const entityType = asString(resolved.entityType).trim();
  const entityId = asString(resolved.entityId).trim();
  if (!subject || !entityType || !entityId) {
    return {
      ok: false,
      error: "crm.create_activity requires subject, entityType, and entityId.",
    };
  }
  const activity = createActivity({
    workspaceId: ctx.workspaceId,
    type:
      typeof resolved.type === "string"
        ? (resolved.type as never)
        : "other",
    subject,
    body: asString(resolved.body) || null,
    entityType: entityType as never,
    entityId,
  });
  return { ok: true, output: { activityId: activity.id, activity } };
}

async function crmCreateDeal(
  ctx: ActionExecutionContext,
  config: Record<string, unknown>,
): Promise<ActionResult> {
  const { createDeal } = await import("@/lib/crm/repository");
  const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
  const title = asString(resolved.title || resolved.name).trim();
  if (!title) return { ok: false, error: "crm.create_deal requires title." };
  const amount =
    typeof resolved.amountCents === "number"
      ? resolved.amountCents
      : typeof resolved.value === "number"
        ? Math.round(resolved.value * 100)
        : Number(resolved.amountCents ?? resolved.value ?? 0) || 0;
  const deal = createDeal({
    workspaceId: ctx.workspaceId,
    title,
    amountCents: amount,
    currency: asString(resolved.currency, "USD"),
    contactId: asString(resolved.contactId) || null,
    companyId: asString(resolved.companyId) || null,
  });
  return { ok: true, output: { dealId: deal.id, deal } };
}

const chatbotSendMessage: AutomationAction = {
  id: "chatbot.send_message",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const conversationId = asString(resolved.conversationId).trim();
    const content = asString(resolved.content || resolved.message).trim();
    if (!conversationId || !content) {
      return {
        ok: false,
        error: "chatbot.send_message requires conversationId and content.",
      };
    }
    const { getConversationById, createMessage } = await import(
      "@/lib/chatbot/repository"
    );
    const conversation = getConversationById(conversationId);
    if (!conversation || conversation.workspaceId !== ctx.workspaceId) {
      return { ok: false, error: "Conversation not found." };
    }
    const message = createMessage({
      conversationId,
      workspaceId: ctx.workspaceId,
      botId: conversation.botId,
      role: "system",
      content,
    });
    return { ok: true, output: { messageId: message.id } };
  },
};

const setVariable: AutomationAction = {
  id: "set_variable",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const key = asString(resolved.key || resolved.name).trim();
    if (!key) return { ok: false, error: "set_variable requires key." };
    return {
      ok: true,
      output: {
        key,
        value: resolved.value,
        vars: { [key]: resolved.value },
      },
    };
  },
};

const logAction: AutomationAction = {
  id: "log",
  async run(ctx, config): Promise<ActionResult> {
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    return {
      ok: true,
      output: {
        message: asString(resolved.message, "log"),
        data: resolved.data ?? {},
      },
    };
  },
};

const actions: Record<ActionType, AutomationAction> = {
  "email.send": emailSend,
  "whatsapp.send": whatsappSend,
  "webhook.http_request": webhookHttp,
  "crm.create_lead": { id: "crm.create_lead", run: crmCreateLead },
  "crm.update_lead": { id: "crm.update_lead", run: crmUpdateLead },
  "crm.create_task": { id: "crm.create_task", run: crmCreateTask },
  "crm.create_activity": { id: "crm.create_activity", run: crmCreateActivity },
  "crm.create_deal": { id: "crm.create_deal", run: crmCreateDeal },
  "chatbot.send_message": chatbotSendMessage,
  set_variable: setVariable,
  log: logAction,
};

export function getAction(type: ActionType): AutomationAction {
  const action = actions[type];
  if (!action) throw new Error(`Unknown action type: ${type}`);
  return action;
}

export function listActionTypes(): ActionType[] {
  return Object.keys(actions) as ActionType[];
}
