"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { getAuthErrorMessage, logAuthErrorInDev } from "@/lib/auth/errors";
import { slugifyWorkspace } from "@/lib/auth/slug";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";

type CreateWorkspaceFormProps = {
  /** First-run onboarding: hide advanced fields (slug, logo). */
  simplified?: boolean;
};

export function CreateWorkspaceForm({
  simplified = false,
}: CreateWorkspaceFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [logo, setLogo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const derivedSlug = useMemo(() => slugifyWorkspace(name), [name]);
  const effectiveSlug = slugTouched ? slug : derivedSlug;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const finalSlug = slugifyWorkspace(effectiveSlug);
    if (!name.trim() || !finalSlug) {
      setError(
        simplified
          ? "Workspace name is required."
          : "Workspace name and slug are required.",
      );
      setPending(false);
      return;
    }

    const { data, error: createError } = await authClient.organization.create({
      name: name.trim(),
      slug: finalSlug,
      logo: simplified ? undefined : logo.trim() || undefined,
      keepCurrentActiveOrganization: false,
    });

    if (createError || !data) {
      logAuthErrorInDev("organization.create", createError ?? { reason: "no data" });
      setError(
        getAuthErrorMessage(createError, "Unable to create workspace."),
      );
      setPending(false);
      return;
    }

    await authClient.organization.setActive({
      organizationId: data.id,
    });

    // Provision Free plan subscription for the new workspace.
    await fetch("/api/billing/bootstrap", { method: "POST" }).catch(() => null);

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="workspace-name" className={authLabelClassName}>
          Workspace name
        </label>
        <input
          id="workspace-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={authInputClassName}
          disabled={pending}
          placeholder="Acme Studio"
        />
      </div>
      {!simplified ? (
        <>
          <div>
            <label htmlFor="workspace-slug" className={authLabelClassName}>
              Slug
            </label>
            <input
              id="workspace-slug"
              name="slug"
              type="text"
              required
              value={effectiveSlug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={authInputClassName}
              disabled={pending}
              placeholder="acme-studio"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Unique URL-safe identifier for this workspace.
            </p>
          </div>
          <div>
            <label htmlFor="workspace-logo" className={authLabelClassName}>
              Logo URL{" "}
              <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              id="workspace-logo"
              name="logo"
              type="url"
              value={logo}
              onChange={(event) => setLogo(event.target.value)}
              className={authInputClassName}
              disabled={pending}
              placeholder="https://…"
            />
          </div>
        </>
      ) : null}
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      <button type="submit" disabled={pending} className={authButtonClassName}>
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
