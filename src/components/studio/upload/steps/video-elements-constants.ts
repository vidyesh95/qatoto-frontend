/** What `POST /videos/:videoId/documents` accepts. Mirrored from the backend, not guessed. */
export const MAX_DOCUMENTS_PER_VIDEO = 5;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export function formatByteSizeLabel(byteSize: number): string {
  if (byteSize < 1024) return `${String(byteSize)} B`;
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(0)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}
