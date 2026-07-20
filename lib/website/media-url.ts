/** Client-safe media URL helper — no server/DB imports. */
export function mediaPublicUrl(mediaId: string): string {
  return `/api/website/media/file/${mediaId}`;
}
