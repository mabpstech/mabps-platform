import { headers } from "next/headers";
import { AcceptInvitePanel } from "@/components/auth/accept-invite-panel";
import { auth } from "@/lib/auth/server";
import { getSession } from "@/lib/auth/session";

type AcceptInvitePageProps = {
  searchParams: Promise<{ invitationId?: string; token?: string }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const params = await searchParams;
  const invitationId = params.invitationId || params.token || "";
  const session = await getSession();

  let workspaceName: string | null = null;
  let role: string | null = null;
  let inviterEmail: string | null = null;
  let errorMessage: string | null = null;

  if (session && invitationId) {
    try {
      const invitation = await auth.api.getInvitation({
        headers: await headers(),
        query: { id: invitationId },
      });
      workspaceName = invitation?.organizationName ?? null;
      role = invitation?.role ?? null;
      inviterEmail = invitation?.inviterEmail ?? null;
    } catch {
      errorMessage = "This invitation is invalid or has expired.";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Accept invitation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Join a workspace you were invited to.
        </p>
      </div>
      <AcceptInvitePanel
        invitationId={invitationId}
        isAuthenticated={Boolean(session)}
        workspaceName={workspaceName}
        role={role}
        inviterEmail={inviterEmail}
        errorMessage={errorMessage}
      />
    </div>
  );
}
