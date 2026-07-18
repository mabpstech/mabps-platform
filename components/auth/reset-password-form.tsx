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

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      setError(resetError.message ?? "Unable to reset password.");
      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className={authErrorClassName}>
          Missing or invalid reset token. Request a new password reset link.
        </div>
        <Link href="/forgot-password" className="text-sm font-medium text-zinc-900 underline">
          Request reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className={authLabelClassName}>
            New password
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
        </div>
        <div>
          <label htmlFor="confirmPassword" className={authLabelClassName}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={authInputClassName}
            disabled={pending}
          />
        </div>
        {error ? <div className={authErrorClassName}>{error}</div> : null}
        {success ? (
          <div className={authSuccessClassName}>
            Password updated. Redirecting to sign in…
          </div>
        ) : null}
        <button type="submit" disabled={pending || success} className={authButtonClassName}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
