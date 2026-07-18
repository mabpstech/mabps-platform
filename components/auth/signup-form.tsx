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
  authSuccessClassName,
} from "@/lib/auth/styles";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

type SignupFormProps = {
  googleEnabled?: boolean;
};

export function SignupForm({ googleEnabled = false }: SignupFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: "/onboarding",
    });

    if (signUpError) {
      setError(signUpError.message ?? "Unable to create account.");
      setPending(false);
      return;
    }

    setInfo("Account created. Check your email to verify when mail delivery is configured.");
    router.push("/onboarding");
    router.refresh();
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
        {error ? <div className={authErrorClassName}>{error}</div> : null}
        {info ? <div className={authSuccessClassName}>{info}</div> : null}
        <button type="submit" disabled={pending} className={authButtonClassName}>
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200" />
            or
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
          <GoogleSignInButton callbackURL="/onboarding" enabled />
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
