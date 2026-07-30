import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/auth/server";

export default function SignupPage() {
  const googleEnabled = isGoogleAuthEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Create account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {googleEnabled
            ? "Create your account and workspace, or continue with Google."
            : "Create your account and workspace with email."}
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
        <SignupForm googleEnabled={googleEnabled} />
      </Suspense>
    </div>
  );
}
