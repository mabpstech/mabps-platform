import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth/server";
import { requireSession } from "@/lib/auth/session";

export default async function AccountSettingsPage() {
  const session = await requireSession({ callbackUrl: "/settings/account" });
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });

  const providers = new Set(
    (accounts ?? []).map((account) => account.providerId),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Profile and linked sign-in methods.
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Profile
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium text-zinc-900">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd className="font-medium text-zinc-900">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Email verified</dt>
            <dd className="font-medium text-zinc-900">
              {session.user.emailVerified ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Linked accounts
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>
            Email / password:{" "}
            <strong>{providers.has("credential") ? "Linked" : "Not linked"}</strong>
          </li>
          <li>
            Google:{" "}
            <strong>{providers.has("google") ? "Linked" : "Not linked"}</strong>
          </li>
        </ul>
      </section>

      <SignOutButton />
    </div>
  );
}
