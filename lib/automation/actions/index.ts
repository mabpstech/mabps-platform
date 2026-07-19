import { resolveValue } from "@/lib/automation/engine/templates";
import { getEmailProvider } from "@/lib/automation/providers/email";
import { getWhatsAppProvider } from "@/lib/automation/providers/whatsapp";
import type {
  ActionExecutionContext,
  AutomationAction,
} from "@/lib/automation/actions/types";
import type { ActionResult, ActionType } from "@/lib/automation/types";

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
    const html = asString(resolved.html) || (text ? `<p>${text}</p>` : "");
    if (!to || !subject) {
      return { ok: false, error: "email.send requires to and subject." };
    }
    if (!html && !text) {
      return { ok: false, error: "email.send requires html or text." };
    }

    const provider = getEmailProvider(
      asString(resolved.provider, "email_engine"),
    );
    const result = await provider.sendEmail(
      { workspaceId: ctx.workspaceId },
      {
        to,
        subject,
        text: text || subject,
        html: html || undefined,
        toName: asString(resolved.toName) || undefined,
        replyTo: asString(resolved.replyTo) || undefined,
        templateId: asString(resolved.templateId) || undefined,
        kind:
          asString(resolved.kind, "transactional") === "marketing"
            ? "marketing"
            : "transactional",
        variables:
          resolved.variables && typeof resolved.variables === "object"
            ? Object.fromEntries(
                Object.entries(resolved.variables as Record<string, unknown>).map(
                  ([key, value]) => [key, String(value ?? "")],
                ),
              )
            : undefined,
      },
    );

    if (!result.ok) {
      return {
        ok: false,
        error: result.error || "Email send failed.",
        output: result.raw,
      };
    }

    return {
      ok: true,
      output: {
        to,
        subject,
        messageId: result.messageId,
        providerMessageId: result.providerMessageId,
      },
    };
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
        workspaceId: ctx.workspaceId,
        phoneNumberId: asString(resolved.phoneNumberId) || undefined,
        accessToken: asString(resolved.accessToken) || undefined,
        wabaId: asString(resolved.wabaId) || undefined,
        apiVersion: asString(resolved.apiVersion) || undefined,
      },
      {
        to: asString(resolved.to),
        message: asString(resolved.message),
        templateName: asString(resolved.templateName) || undefined,
        templateParams:
          resolved.templateParams && typeof resolved.templateParams === "object"
            ? (resolved.templateParams as Record<string, string>)
            : undefined,
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

const knowledgeSearch: AutomationAction = {
  id: "knowledge.search",
  async run(ctx, config): Promise<ActionResult> {
    const { searchKnowledgeForAutomation } = await import("@/lib/knowledge");
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const query = asString(resolved.query || resolved.q || resolved.message).trim();
    if (!query) {
      return { ok: false, error: "knowledge.search requires query." };
    }
    const sourceIds = Array.isArray(resolved.sourceIds)
      ? resolved.sourceIds.filter(
          (value): value is string => typeof value === "string",
        )
      : undefined;
    const limit =
      typeof resolved.limit === "number" ? resolved.limit : undefined;
    const result = await searchKnowledgeForAutomation({
      workspaceId: ctx.workspaceId,
      query,
      limit,
      sourceIds,
    });
    return {
      ok: true,
      output: {
        query: result.query,
        context: result.context,
        hits: result.hits,
        vars: {
          knowledgeContext: result.context,
          knowledgeHits: result.hits,
        },
      },
    };
  },
};

const memoryRemember: AutomationAction = {
  id: "memory.remember",
  async run(ctx, config): Promise<ActionResult> {
    const { rememberForAutomation } = await import("@/lib/memory");
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const content = asString(resolved.content || resolved.value || resolved.text).trim();
    const kind = asString(resolved.kind, "long_term").trim();
    if (!content) {
      return { ok: false, error: "memory.remember requires content." };
    }
    if (
      kind !== "short_term" &&
      kind !== "long_term" &&
      kind !== "profile" &&
      kind !== "business"
    ) {
      return {
        ok: false,
        error:
          "memory.remember kind must be short_term, long_term, profile, or business.",
      };
    }
    const result = await rememberForAutomation({
      workspaceId: ctx.workspaceId,
      kind,
      content,
      key: asString(resolved.key) || null,
      scopeType: (asString(resolved.scopeType) || undefined) as
        | "workspace"
        | "visitor"
        | "conversation"
        | "contact"
        | "bot"
        | "user"
        | undefined,
      scopeId: asString(resolved.scopeId) || null,
      importance:
        typeof resolved.importance === "number"
          ? resolved.importance
          : undefined,
      metadata:
        resolved.metadata && typeof resolved.metadata === "object"
          ? (resolved.metadata as Record<string, unknown>)
          : undefined,
      merge: resolved.merge === true,
    });
    return {
      ok: true,
      output: {
        memoryId: result.memory.id,
        memory: result.memory,
        merged: result.merged,
        vars: {
          memoryId: result.memory.id,
          memoryContent: result.memory.content,
        },
      },
    };
  },
};

const memorySearch: AutomationAction = {
  id: "memory.search",
  async run(ctx, config): Promise<ActionResult> {
    const { searchMemoryForAutomation } = await import("@/lib/memory");
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const query = asString(resolved.query || resolved.q || resolved.message).trim();
    if (!query) {
      return { ok: false, error: "memory.search requires query." };
    }
    const kinds = Array.isArray(resolved.kinds)
      ? resolved.kinds.filter(
          (value): value is "short_term" | "long_term" | "profile" | "business" =>
            value === "short_term" ||
            value === "long_term" ||
            value === "profile" ||
            value === "business",
        )
      : undefined;
    const result = await searchMemoryForAutomation({
      workspaceId: ctx.workspaceId,
      query,
      limit: typeof resolved.limit === "number" ? resolved.limit : undefined,
      kinds,
      scopeType: (asString(resolved.scopeType) || undefined) as
        | "workspace"
        | "visitor"
        | "conversation"
        | "contact"
        | "bot"
        | "user"
        | undefined,
      scopeId: asString(resolved.scopeId) || null,
    });
    return {
      ok: true,
      output: {
        query: result.query,
        context: result.context,
        hits: result.hits,
        vars: {
          memoryContext: result.context,
          memoryHits: result.hits,
        },
      },
    };
  },
};

const memoryMerge: AutomationAction = {
  id: "memory.merge",
  async run(ctx, config): Promise<ActionResult> {
    const { mergeMemoryForAutomation } = await import("@/lib/memory");
    const resolved = resolveValue(config, ctx.context) as Record<string, unknown>;
    const memoryIds = Array.isArray(resolved.memoryIds)
      ? resolved.memoryIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];
    if (memoryIds.length < 2) {
      return {
        ok: false,
        error: "memory.merge requires at least two memoryIds.",
      };
    }
    const result = await mergeMemoryForAutomation({
      workspaceId: ctx.workspaceId,
      memoryIds,
    });
    return {
      ok: true,
      output: {
        survivorId: result.survivorId,
        mergedIds: result.mergedIds,
        vars: { memorySurvivorId: result.survivorId },
      },
    };
  },
};

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
  "knowledge.search": knowledgeSearch,
  "memory.remember": memoryRemember,
  "memory.search": memorySearch,
  "memory.merge": memoryMerge,
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
