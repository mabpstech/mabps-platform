"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, logAuthErrorInDev } from "@/lib/auth/errors";
import { slugifyWorkspace } from "@/lib/auth/slug";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type SignupFormProps = {
  googleEnabled?: boolean;
};

export function SignupForm({ googleEnabled = false }: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const acceptingInvite = Boolean(
    callbackUrl?.startsWith("/accept-invite"),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const derivedSlug = useMemo(
    () => slugifyWorkspace(workspaceName),
    [workspaceName],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    if (!acceptingInvite) {
      const finalSlug = slugifyWorkspace(derivedSlug);
      if (!workspaceName.trim() || !finalSlug) {
        setError("Workspace name is required.");
        setPending(false);
        return;
      }
    }

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: acceptingInvite
          ? (callbackUrl as string)
          : "/dashboard",
      });

      if (signUpError) {
        logAuthErrorInDev("signUp.email", signUpError);
        setError(getAuthErrorMessage(signUpError));
        setPending(false);
        return;
      }

      if (acceptingInvite && callbackUrl) {
        setInfo("Account created. Continue to accept your invitation.");
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      const finalSlug = slugifyWorkspace(derivedSlug);
      const { data, error: createError } = await authClient.organization.create({
        name: workspaceName.trim(),
        slug: finalSlug,
        keepCurrentActiveOrganization: false,
      });

      if (createError || !data) {
        logAuthErrorInDev("organization.create", createError ?? { reason: "no data" });
        setInfo(
          "Account created, but workspace setup needs one more step.",
        );
        router.push("/onboarding");
        router.refresh();
        return;
      }

      await authClient.organization.setActive({
        organizationId: data.id,
      });

      await fetch("/api/billing/bootstrap", { method: "POST" }).catch(() => null);

      router.push("/dashboard");
      router.refresh();
    } catch (unexpectedError) {
      logAuthErrorInDev("signup.submit", unexpectedError);
      setError(
        getAuthErrorMessage(
          unexpectedError &&
            typeof unexpectedError === "object" &&
            "message" in unexpectedError
            ? (unexpectedError as { message?: string })
            : null,
          "Unable to create account. Please try again.",
        ),
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className={authLabelClassName}>
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={authInputClassName}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="email" className={authLabelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={authInputClassName}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClassName}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            disabled={pending}
          />
          <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
        </div>

        {!acceptingInvite ? (
          <>
            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-900">Your workspace</p>
              <p className="mt-1 text-xs text-zinc-500">
                Created on signup. You will be the Owner.
              </p>
            </div>
            <div>
              <label htmlFor="workspace-name" className={authLabelClassName}>
                Workspace name
              </label>
              <input
                id="workspace-name"
                name="workspaceName"
                type="text"
                required
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className={authInputClassName}
                disabled={pending}
                placeholder="Acme Studio"
              />
            </div>
          </>
        ) : null}

        {error ? <div className={authErrorClassName}>{error}</div> : null}
        {info ? <div className={authSuccessClassName}>{info}</div> : null}
        <button type="submit" disabled={pending} className={authButtonClassName}>
          {pending
            ? "Creating…"
            : acceptingInvite
              ? "Create account"
              : "Create account & workspace"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            or
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <GoogleSignInButton
            callbackURL={
              acceptingInvite && callbackUrl ? callbackUrl : "/onboarding"
            }
            enabled
          />
        </>
      ) : null}

      <p className="text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
