import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPrefixes = ["/dashboard", "/onboarding", "/settings"];
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

/**
 * Optimistic cookie check for redirects only.
 * Real authorization always happens via getSession / requireSession in layouts and pages.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    "/login",
    "/signup",
    "/forgot-password",
  ],
};
