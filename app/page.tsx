import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ensureActiveWorkspace } from "@/lib/auth/workspace";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    const workspace = await ensureActiveWorkspace(session);
    redirect(workspace ? "/dashboard" : "/onboarding");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-md text-center">
        <p className="text-3xl font-semibold tracking-tight text-zinc-900">MABPS</p>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Sign in to manage your workspaces. Authentication and multi-tenant
          organization support are powered by Better Auth.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
