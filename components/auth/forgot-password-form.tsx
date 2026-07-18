"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
  authSuccessClassName,
} from "@/lib/auth/styles";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message ?? "Unable to request password reset.");
      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
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
        {error ? <div className={authErrorClassName}>{error}</div> : null}
        {success ? (
          <div className={authSuccessClassName}>
            If that email exists, we sent a reset link. Check your inbox (or the
            server console in development).
          </div>
        ) : null}
        <button type="submit" disabled={pending} className={authButtonClassName}>
          {pending ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-sm text-zinc-600">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
