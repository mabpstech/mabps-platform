import { redirect } from "next/navigation";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";
import { requireSession } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/auth/workspace";

export default async function OnboardingPage() {
  await requireSession({ callbackUrl: "/onboarding" });
  const workspaces = await getUserWorkspaces();

  if (workspaces.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Create your first workspace
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Workspaces isolate teams and data. You&apos;ll be the owner of this
          workspace.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CreateWorkspaceForm />
      </div>
    </div>
  );
}
