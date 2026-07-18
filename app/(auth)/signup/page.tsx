import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleAuthEnabled } from "@/lib/auth/server";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Create account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create your account and workspace, or continue with Google.
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
        <SignupForm googleEnabled={isGoogleAuthEnabled} />
      </Suspense>
    </div>
  );
}
