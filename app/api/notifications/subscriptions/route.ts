import { NextResponse } from "next/server";
import { requireNotificationsMemberApi } from "@/lib/notifications/access";
import { notificationsErrorResponse } from "@/lib/notifications/http";
import {
  deactivateSubscription,
  ensureWorkspaceNotifications,
  listSubscriptions,
  upsertSubscription,
} from "@/lib/notifications/repository";

export async function GET() {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    return NextResponse.json({
      subscriptions: listSubscriptions(workspace.id, {
        userId: session.user.id,
        activeOnly: false,
      }),
    });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const body = (await request.json()) as Record<string, unknown>;

    const endpoint =
      typeof body.endpoint === "string" ? body.endpoint.trim() : "";
    if (!endpoint) throw new Error("endpoint is required.");

    const channel =
      body.channel === "push" || body.channel === "browser"
        ? body.channel
        : "browser";

    const subscription = upsertSubscription({
      workspaceId: workspace.id,
      userId: session.user.id,
      channel,
      endpoint,
      p256dh: typeof body.p256dh === "string" ? body.p256dh : null,
      auth: typeof body.auth === "string" ? body.auth : null,
      userAgent:
        typeof body.userAgent === "string"
          ? body.userAgent
          : request.headers.get("user-agent"),
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace, session } = await requireNotificationsMemberApi();
    ensureWorkspaceNotifications(workspace.id);
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("id")?.trim();
    if (!subscriptionId) throw new Error("id is required.");

    const ok = deactivateSubscription(
      workspace.id,
      subscriptionId,
      session.user.id,
    );
    if (!ok) throw new Error("Subscription not found.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return notificationsErrorResponse(error);
  }
}
