/** Client-safe media URL helper — no server/DB imports. */
export function mediaPublicUrl(
  mediaId: string,
  size?: "thumbnail" | "medium" | "large" | "original",
  version?: string | number | null,
): string {
  const params = new URLSearchParams();
  if (size && size !== "original") params.set("size", size);
  if (version != null && String(version).length > 0) {
    // Short cache-bust token so edited assets refresh without year-long stale hits.
    params.set("v", String(version).replace(/[^\w.-]/g, "").slice(0, 32));
  }
  const qs = params.toString();
  return `/api/website/media/file/${mediaId}${qs ? `?${qs}` : ""}`;
}
