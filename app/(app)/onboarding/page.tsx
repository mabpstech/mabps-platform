import { redirect } from "next/navigation";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";
import { FirstRunPanel } from "@/components/onboarding/first-run";
import { requireSession } from "@/lib/auth/session";
import { getUserWorkspaces } from "@/lib/auth/workspace";

type OnboardingPageProps = {
  searchParams: Promise<{ new?: string }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  await requireSession({ callbackUrl: "/onboarding" });
  const params = await searchParams;
  const creatingAdditional = params.new === "1";
  const workspaces = await getUserWorkspaces();

  if (workspaces.length > 0 && !creatingAdditional) {
    redirect("/dashboard");
  }

  if (creatingAdditional) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Create another workspace
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Workspaces isolate teams and data. You&apos;ll be the Owner of this
            workspace.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <CreateWorkspaceForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FirstRunPanel
        currentStep="workspace"
        showQuickActions={false}
        encouragement="Name your workspace to unlock websites, publishing, and the rest of MABPS."
      >
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-base font-semibold text-zinc-900">
            Create your first workspace
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            This takes about 30 seconds. You&apos;ll be the Owner.
          </p>
          <div className="mt-4">
            <CreateWorkspaceForm simplified />
          </div>
        </div>
      </FirstRunPanel>
    </div>
  );
}
