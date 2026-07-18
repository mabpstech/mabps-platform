"use client";

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

type WorkspaceSettingsFormProps = {
  organizationId: string;
  name: string;
  slug: string;
  logo?: string | null;
  canEdit: boolean;
};

export function WorkspaceSettingsForm({
  organizationId,
  name: initialName,
  slug: initialSlug,
  logo: initialLogo,
  canEdit,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [logo, setLogo] = useState(initialLogo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(false);

    const { error: updateError } = await authClient.organization.update({
      data: {
        name,
        slug,
        logo: logo || undefined,
      },
      organizationId,
    });

    if (updateError) {
      setError(updateError.message ?? "Unable to update workspace.");
      setPending(false);
      return;
    }

    setSuccess(true);
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className={authLabelClassName}>
          Name
        </label>
        <input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={authInputClassName}
          disabled={!canEdit || pending}
          required
        />
      </div>
      <div>
        <label htmlFor="slug" className={authLabelClassName}>
          Slug
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className={authInputClassName}
          disabled={!canEdit || pending}
          required
        />
      </div>
      <div>
        <label htmlFor="logo" className={authLabelClassName}>
          Logo URL
        </label>
        <input
          id="logo"
          value={logo}
          onChange={(event) => setLogo(event.target.value)}
          className={authInputClassName}
          disabled={!canEdit || pending}
          placeholder="https://…"
        />
      </div>
      {error ? <div className={authErrorClassName}>{error}</div> : null}
      {success ? <div className={authSuccessClassName}>Workspace updated.</div> : null}
      {canEdit ? (
        <button type="submit" disabled={pending} className={`${authButtonClassName} sm:w-auto`}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      ) : (
        <p className="text-sm text-zinc-500">
          Only owners and admins can edit workspace settings.
        </p>
      )}
    </form>
  );
}
