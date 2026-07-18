"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type LoginFormProps = {
  callbackUrl?: string;
  googleEnabled?: boolean;
};

export function LoginForm({
  callbackUrl = "/dashboard",
  googleEnabled = false,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    });

    if (signInError) {
      setError(signInError.message ?? "Unable to sign in.");
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
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
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-zinc-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-zinc-600 underline-offset-2 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={authInputClassName}
            disabled={pending}
          />
        </div>
        {error ? <div className={authErrorClassName}>{error}</div> : null}
        <button type="submit" disabled={pending} className={authButtonClassName}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            or
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <GoogleSignInButton callbackURL={callbackUrl} enabled />
        </>
      ) : null}

      <p className="text-center text-sm text-zinc-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
