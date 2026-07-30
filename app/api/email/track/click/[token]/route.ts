import { NextResponse } from "next/server";
import { trackClick } from "@/lib/email-engine/engine/tracking";
import { enforcePublicRateLimit, getClientIp } from "@/lib/platform/rate-limit";
import { sanitizeRedirectUrl } from "@/lib/platform/safe-url";

type Params = { params: Promise<{ token: string }> };

function toAbsoluteRedirect(request: Request, target: string): URL {
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return new URL(target);
  }
  return new URL(target.startsWith("/") ? target : `/${target}`, request.url);
}

export async function GET(request: Request, { params }: Params) {
  const limited = enforcePublicRateLimit(request, "tracking");
  if (limited) return limited;

  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const redirectUrl = sanitizeRedirectUrl(searchParams.get("u"), "/");
  const ip = getClientIp(request);

  try {
    const result = trackClick({
      token,
      url: redirectUrl,
      userAgent: request.headers.get("user-agent"),
      ip,
    });
    return NextResponse.redirect(
      toAbsoluteRedirect(request, sanitizeRedirectUrl(result.redirectUrl, "/")),
      302,
    );
  } catch (error) {
    console.error("[email-engine:track-click]", error);
    return NextResponse.redirect(toAbsoluteRedirect(request, redirectUrl), 302);
  }
}
