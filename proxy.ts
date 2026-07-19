import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPrefixes = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/sites",
  "/crm",
  "/ai",
  "/whatsapp",
  "/email",
  "/notifications",
  "/chatbot",
  "/analytics",
];
const guestOnlyPaths = ["/login", "/signup", "/forgot-password"];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isGuestOnlyPath(pathname: string): boolean {
  return guestOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function appHosts(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const configured =
    process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      hosts.add(new URL(configured).hostname.toLowerCase());
    } catch {
      // ignore invalid URL
    }
  }
  return hosts;
}

/**
 * Optimistic cookie check for redirects only.
 * Real authorization always happens via getSession / requireSession in layouts and pages.
 * Non-app hosts rewrite to /site/...; the page resolves the published custom domain.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostHeader =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const hostname = hostHeader?.split(":")[0]?.toLowerCase();

  if (
    hostname &&
    !appHosts().has(hostname) &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/site")
  ) {
    const rewriteUrl = request.nextUrl.clone();
    const suffix = pathname === "/" ? "" : pathname;
    rewriteUrl.pathname = `/site${suffix}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  const sessionCookie = getSessionCookie(request);

  if (isProtectedPath(pathname) && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyPath(pathname) && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/settings/:path*",
    "/sites/:path*",
    "/sites",
    "/crm/:path*",
    "/crm",
    "/ai/:path*",
    "/ai",
    "/whatsapp/:path*",
    "/whatsapp",
    "/email/:path*",
    "/email",
    "/notifications/:path*",
    "/notifications",
    "/chatbot/:path*",
    "/chatbot",
    "/analytics/:path*",
    "/analytics",
    "/login",
    "/signup",
    "/forgot-password",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
