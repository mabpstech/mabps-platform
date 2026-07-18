"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { authSecondaryButtonClassName } from "@/lib/auth/styles";

type GoogleSignInButtonProps = {
  callbackURL?: string;
  enabled?: boolean;
};

export function GoogleSignInButton({
  callbackURL = "/dashboard",
  enabled = true,
}: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return null;
  }

  async function handleClick() {
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (signInError) {
      setError(signInError.message ?? "Google sign-in failed.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={authSecondaryButtonClassName}
      >
        <GoogleIcon />
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
