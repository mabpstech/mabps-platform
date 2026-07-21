/** Client-safe media URL helper — no server/DB imports. */
export function mediaPublicUrl(
  mediaId: string,
  size?: "thumbnail" | "medium" | "large" | "original",
): string {
  if (!size || size === "original") {
    return `/api/website/media/file/${mediaId}`;
  }
  return `/api/website/media/file/${mediaId}?size=${size}`;
}
