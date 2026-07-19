import { requireAiMemberApi } from "@/lib/ai/access";
import { streamAssistantMessage } from "@/lib/ai/engine/chat";
import { aiErrorResponse, parseAiProvider } from "@/lib/ai/http";
import { getConversationById } from "@/lib/ai/repository";

type RouteContext = { params: Promise<{ conversationId: string }> };

function encodeSse(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { workspace, session } = await requireAiMemberApi();
    const { conversationId } = await context.params;
    const conversation = getConversationById(conversationId);
    if (
      !conversation ||
      conversation.workspaceId !== workspace.id ||
      conversation.userId !== session.user.id
    ) {
      return aiErrorResponse(new Error("Conversation not found."));
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.content !== "string" || !body.content.trim()) {
      return aiErrorResponse(new Error("content is required."));
    }

    const provider =
      body.provider !== undefined ? parseAiProvider(body.provider) : undefined;
    if (body.provider !== undefined && body.provider !== null && !provider) {
      return aiErrorResponse(
        new Error("provider must be openai, gemini, or openrouter."),
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamAssistantMessage({
            conversationId,
            workspaceId: workspace.id,
            userId: session.user.id,
            content: body.content as string,
            provider,
            model: typeof body.model === "string" ? body.model : undefined,
            workspaceName: workspace.name,
          })) {
            controller.enqueue(encoder.encode(encodeSse(chunk)));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "AI Assistant stream failed.";
          controller.enqueue(
            encoder.encode(encodeSse({ type: "error", message })),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
