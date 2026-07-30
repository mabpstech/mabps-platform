/**
 * Optimistic concurrency for website editors.
 * Clients send the revision they loaded; mismatched writes return 409.
 */

export class EditConflictError extends Error {
  readonly code = "edit_conflict" as const;
  readonly currentUpdatedAt: string;

  constructor(currentUpdatedAt: string) {
    super(
      "This content was modified in another session. Reload to continue editing.",
    );
    this.name = "EditConflictError";
    this.currentUpdatedAt = currentUpdatedAt;
  }
}

export function assertExpectedUpdatedAt(
  currentUpdatedAt: string,
  expectedUpdatedAt: string | null | undefined,
): void {
  if (expectedUpdatedAt === undefined || expectedUpdatedAt === null) {
    return;
  }
  if (currentUpdatedAt !== expectedUpdatedAt) {
    throw new EditConflictError(currentUpdatedAt);
  }
}

/** Stable revision token for a navigation list (max updatedAt, or empty). */
export function navigationRevision(
  items: Array<{ updatedAt: string }>,
): string {
  if (items.length === 0) return "";
  let max = items[0].updatedAt;
  for (let i = 1; i < items.length; i += 1) {
    if (items[i].updatedAt > max) max = items[i].updatedAt;
  }
  return max;
}

export function readExpectedUpdatedAt(
  body: Record<string, unknown>,
): string | undefined {
  if (typeof body.expectedUpdatedAt === "string") {
    return body.expectedUpdatedAt;
  }
  if (body.expectedUpdatedAt === null) {
    return "";
  }
  return undefined;
}
