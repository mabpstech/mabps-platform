import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ensureActiveWorkspace } from "@/lib/auth/workspace";

/**
 * Ensures the current session has an active workspace.
 * Used after login when Better Auth leaves activeOrganizationId unset.
 */
export async function POST() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session);
  if (!workspace) {
    return NextResponse.json({ workspace: null }, { status: 200 });
  }

  // Re-read session so the response reflects the activated organization.
  const refreshed = await auth.api.getSession({ headers: requestHeaders });

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
    },
    activeOrganizationId:
      refreshed?.session.activeOrganizationId ?? workspace.id,
  });
}
