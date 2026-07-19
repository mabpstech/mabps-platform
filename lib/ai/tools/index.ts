import { recordAnalyticsEvent } from "@/lib/analytics/consumers";
import { getAnalyticsOverview } from "@/lib/analytics/repository";
import {
  getAutomationOverview,
  listWorkflows,
} from "@/lib/automation/repository";
import {
  assertWithinLimit,
  getWorkspacePlanId,
  getWorkspaceUsage,
} from "@/lib/billing/entitlements";
import { getPlan } from "@/lib/billing/plans";
import {
  getSubscriptionByWorkspaceId,
  listInvoicesForWorkspace,
} from "@/lib/billing/repository";
import {
  getChatbotOverview,
  listBots,
  listConversations,
  listHandoffs,
} from "@/lib/chatbot/repository";
import { getCrmOverview, searchCrm } from "@/lib/crm/repository";
import { searchKnowledge } from "@/lib/knowledge/search";
import { searchMemory } from "@/lib/memory/search";
import { sendWorkspaceNotification } from "@/lib/notifications/engine/send";
import {
  getNotificationsOverview,
  listNotifications,
} from "@/lib/notifications/repository";
import { troubleshootWorkspace } from "@/lib/guardian/engine/troubleshoot";
import {
  getGuardianOverview,
  listFindings,
  listRepairs,
} from "@/lib/guardian/repository";
import type { AiRegisteredTool, AiToolContext } from "@/lib/ai/tools/types";
import type { AiToolDefinition, AiToolResult } from "@/lib/ai/types";
import { listSitesForWorkspace } from "@/lib/website/repository";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function ok(output: unknown): AiToolResult {
  return { ok: true, output };
}

function fail(error: string): AiToolResult {
  return { ok: false, output: null, error };
}

const tools: AiRegisteredTool[] = [
  {
    name: "crm_overview",
    description: "Get CRM overview stats for the active workspace.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) => ok(getCrmOverview(ctx.workspaceId)),
  },
  {
    name: "crm_search",
    description: "Search CRM companies, contacts, leads, customers, and deals.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        limit: { type: "number", description: "Max results (default 10)" },
      },
      required: ["query"],
    },
    handler: (ctx, args) => {
      const query = asString(args.query).trim();
      if (!query) return fail("query is required.");
      return ok(searchCrm(ctx.workspaceId, query, asNumber(args.limit, 10)));
    },
  },
  {
    name: "knowledge_search",
    description: "Search the workspace knowledge base.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
    handler: async (ctx, args) => {
      const query = asString(args.query).trim();
      if (!query) return fail("query is required.");
      const result = await searchKnowledge({
        workspaceId: ctx.workspaceId,
        query,
        limit: asNumber(args.limit, 5),
      });
      return ok({
        query: result.query,
        provider: result.provider,
        model: result.model,
        hits: result.hits.map((hit) => ({
          score: hit.score,
          sourceTitle: hit.sourceTitle,
          sourceId: hit.sourceId,
          content: hit.chunk.content.slice(0, 1200),
        })),
      });
    },
  },
  {
    name: "memory_search",
    description: "Search workspace memory entries.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
    handler: async (ctx, args) => {
      const query = asString(args.query).trim();
      if (!query) return fail("query is required.");
      const result = await searchMemory({
        workspaceId: ctx.workspaceId,
        query,
        limit: asNumber(args.limit, 8),
      });
      return ok(result);
    },
  },
  {
    name: "chatbot_overview",
    description: "Get chatbot module overview and recent handoffs.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) =>
      ok({
        overview: getChatbotOverview(ctx.workspaceId),
        bots: listBots(ctx.workspaceId).map((bot) => ({
          id: bot.id,
          name: bot.name,
          status: bot.status,
          provider: bot.provider,
          model: bot.model,
        })),
        openHandoffs: listHandoffs(ctx.workspaceId).slice(0, 10),
        recentConversations: listConversations(ctx.workspaceId, {
          limit: 10,
        }).map((conversation) => ({
          id: conversation.id,
          botId: conversation.botId,
          status: conversation.status,
          channel: conversation.channel,
          updatedAt: conversation.updatedAt,
        })),
      }),
  },
  {
    name: "automation_overview",
    description: "Get automation overview and active workflows.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) =>
      ok({
        overview: getAutomationOverview(ctx.workspaceId),
        workflows: listWorkflows(ctx.workspaceId)
          .slice(0, 25)
          .map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            status: workflow.status,
            triggerType: workflow.triggerType,
            updatedAt: workflow.updatedAt,
          })),
      }),
  },
  {
    name: "notifications_overview",
    description:
      "Get notifications module overview, unread count, and recent items.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) =>
      ok({
        overview: getNotificationsOverview(ctx.workspaceId),
        recent: listNotifications(ctx.workspaceId, { limit: 10 }).map(
          (item) => ({
            id: item.id,
            title: item.title,
            priority: item.priority,
            category: item.category,
            isRead: item.isRead,
            status: item.status,
            createdAt: item.createdAt,
          }),
        ),
      }),
  },
  {
    name: "notifications_send",
    description:
      "Send a workspace notification across in-app, push, email, WhatsApp, or browser channels.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        userId: { type: "string" },
        priority: {
          type: "string",
          description: "low | normal | high | urgent",
        },
        channels: {
          type: "array",
          items: { type: "string" },
          description: "in_app | push | email | whatsapp | browser",
        },
        href: { type: "string" },
      },
      required: ["title", "body"],
    },
    handler: async (ctx, args) => {
      const title = asString(args.title).trim();
      const body = asString(args.body).trim();
      if (!title || !body) return fail("title and body are required.");
      const channels = Array.isArray(args.channels)
        ? args.channels.map((item) => String(item))
        : undefined;
      const result = await sendWorkspaceNotification(ctx.workspaceId, {
        userId: asString(args.userId) || ctx.userId || null,
        title,
        body,
        href: asString(args.href) || null,
        priority: ["low", "normal", "high", "urgent"].includes(
          asString(args.priority),
        )
          ? (asString(args.priority) as "low" | "normal" | "high" | "urgent")
          : undefined,
        channels: channels as
          | Array<"in_app" | "push" | "email" | "whatsapp" | "browser">
          | undefined,
        createdByUserId: ctx.userId,
      });
      return ok({
        notificationId: result.notification.id,
        status: result.notification.status,
        channels: result.notification.channels,
      });
    },
  },
  {
    name: "website_list_sites",
    description: "List website builder sites for the workspace.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) =>
      ok(
        listSitesForWorkspace(ctx.workspaceId).map((site) => ({
          id: site.id,
          name: site.name,
          slug: site.slug,
          status: site.status,
          customDomain: site.customDomain,
          publishedAt: site.publishedAt,
          updatedAt: site.updatedAt,
        })),
      ),
  },
  {
    name: "analytics_overview",
    description: "Get analytics overview for the last 30 days.",
    parameters: {
      type: "object",
      properties: {
        range: {
          type: "string",
          description: "7d | 30d | 90d | 12m | all",
        },
      },
    },
    handler: (ctx, args) => {
      const range = asString(args.range, "30d");
      const allowed = ["7d", "30d", "90d", "12m", "all"] as const;
      const safeRange = allowed.includes(range as (typeof allowed)[number])
        ? (range as (typeof allowed)[number])
        : "30d";
      return ok(getAnalyticsOverview(ctx.workspaceId, safeRange));
    },
  },
  {
    name: "billing_usage",
    description: "Get billing plan, subscription status, and usage limits.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) => {
      const planId = getWorkspacePlanId(ctx.workspaceId);
      const plan = getPlan(planId);
      const usage = getWorkspaceUsage(ctx.workspaceId);
      const subscription = getSubscriptionByWorkspaceId(ctx.workspaceId);
      const invoices = listInvoicesForWorkspace(ctx.workspaceId).slice(0, 5);
      return ok({
        planId,
        planName: plan.name,
        limits: plan.limits,
        usage,
        subscription: subscription
          ? {
              status: subscription.status,
              planId: subscription.planId,
              currentPeriodEnd: subscription.currentPeriodEnd,
            }
          : null,
        recentInvoices: invoices.map((invoice) => ({
          id: invoice.id,
          status: invoice.status,
          amountDue: invoice.amountDue,
          amountPaid: invoice.amountPaid,
          createdAt: invoice.createdAt,
        })),
      });
    },
  },
  {
    name: "billing_check_ai_credits",
    description: "Check whether the workspace can spend more AI credits.",
    parameters: {
      type: "object",
      properties: {
        credits: {
          type: "number",
          description: "Projected credits to consume (default 1)",
        },
      },
    },
    handler: (ctx, args) => {
      const credits = Math.max(1, Math.floor(asNumber(args.credits, 1)));
      try {
        assertWithinLimit(ctx.workspaceId, "aiCredits", { delta: credits });
        return ok({ allowed: true, credits });
      } catch (error) {
        return fail(
          error instanceof Error ? error.message : "AI credit limit exceeded.",
        );
      }
    },
  },
  {
    name: "guardian_overview",
    description:
      "Get AI Guardian health overview, open findings, and suggested repairs.",
    parameters: { type: "object", properties: {} },
    handler: (ctx) =>
      ok({
        overview: getGuardianOverview(ctx.workspaceId),
        openFindings: listFindings(ctx.workspaceId, {
          status: "open",
          limit: 15,
        }).map((finding) => ({
          id: finding.id,
          code: finding.code,
          title: finding.title,
          category: finding.category,
          severity: finding.severity,
          suggestion: finding.suggestion,
          autoRepairable: finding.autoRepairable,
        })),
        suggestedRepairs: listRepairs(ctx.workspaceId, {
          status: "suggested",
          limit: 10,
        }).map((repair) => ({
          id: repair.id,
          title: repair.title,
          action: repair.action,
          oneClick: repair.oneClick,
          riskLevel: repair.riskLevel,
        })),
      }),
  },
  {
    name: "guardian_troubleshoot",
    description:
      "Run AI Guardian troubleshooting for open findings and return recommended actions.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Optional operator question about the incident",
        },
      },
    },
    handler: async (ctx, args) => {
      const result = await troubleshootWorkspace({
        workspaceId: ctx.workspaceId,
        question: asString(args.question) || null,
      });
      return ok(result);
    },
  },
];

const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

export function listAiTools(): AiToolDefinition[] {
  return tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

export function getAiTool(name: string): AiRegisteredTool | null {
  return toolMap.get(name) || null;
}

export async function executeAiTool(
  ctx: AiToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<AiToolResult> {
  const tool = getAiTool(name);
  if (!tool) {
    return fail(`Unknown tool: ${name}`);
  }

  try {
    const result = await tool.handler(ctx, args || {});
    recordAnalyticsEvent({
      workspaceId: ctx.workspaceId,
      source: "ai",
      name: "tool_executed",
      userId: ctx.userId,
      entityType: "ai_tool",
      entityId: name,
      properties: {
        ok: result.ok,
        error: result.error ?? null,
      },
    });
    return result;
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "Tool execution failed.",
    );
  }
}

export type { AiToolContext };
