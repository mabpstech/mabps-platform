"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  authButtonClassName,
  authErrorClassName,
  authInputClassName,
  authLabelClassName,
} from "@/lib/auth/styles";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const derivedSlug = useMemo(() => slugify(name), [name]);
  const effectiveSlug = slugTouched ? slug : derivedSlug;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const finalSlug = slugify(effectiveSlug);
    if (!name.trim() || !finalSlug) {
      setError("Workspace name and slug are required.");
      setPending(false);
      return;
    }

    const { data, error: createError } = await authClient.organization.create({
      name: name.trim(),
      slug: finalSlug,
      keepCurrentActiveOrganization: false,
    });

    if (createError || !data) {
      setError(createError?.message ?? "Unable to create workspace.");
      setPending(false);
      return;
    }

    await authClient.organization.setActive({
      organizationId: data.id,
    });

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
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      <button type="submit" disabled={pending} className={authButtonClassName}>
        {pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
  );
}
