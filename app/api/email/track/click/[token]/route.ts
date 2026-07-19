import { NextResponse } from "next/server";
import { trackClick } from "@/lib/email-engine/engine/tracking";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("u") || "/";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip");

  try {
    const result = trackClick({
      token,
      url,
      userAgent: request.headers.get("user-agent"),
      ip,
    });
    return NextResponse.redirect(result.redirectUrl, 302);
  } catch (error) {
    console.error("[email-engine:track-click]", error);
    return NextResponse.redirect(url, 302);
  }
}
