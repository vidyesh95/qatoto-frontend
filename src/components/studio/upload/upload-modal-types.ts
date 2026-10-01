export const UPLOAD_STEPS = [
  { id: "details", label: "Details" },
  { id: "video-elements", label: "Video elements" },
  { id: "checks", label: "Checks" },
  { id: "visibility", label: "Visibility" },
] as const;

export type UploadStepId = (typeof UPLOAD_STEPS)[number]["id"];

export type ActiveOverlay =
  | "none"
  | "playlists-picker"
  | "create-playlist"
  | "store-products-picker"
  | "invite-collaborator";

/**
 * What the new video is sourced from.
 *
 * ONLY THE YOUTUBE PATH REACHES THE BACKEND. `POST /videos` requires a `youtubeUrl` and there is
 * no video-file upload route anywhere on the platform — self-hosting is deferred (Studio
 * Appendix A). The `file` variant is kept because the entry UI still offers it, and it now
 * fails honestly at save time instead of appearing to work.
 */
export type UploadSource =
  | { kind: "file"; videoFile: File }
  | { kind: "youtube"; youtubeUrl: string };

export type UploadVideoModalProps =
  | { mode: "create"; source: UploadSource; onClose: () => void }
  | { mode: "edit"; videoIdToEdit: string; onClose: () => void };

/**
 * What a save actually did, returned rather than read back off state.
 *
 * The video and its three follow-up routes can fail INDEPENDENTLY — the row is written and the
 * chapters are not — so "did it save" and "is everything saved" are different questions. The
 * caller needs the second one to decide whether to close, and needs the id to publish.
 */
export type SaveOutcome =
  | { readonly kind: "create_failed"; readonly error?: unknown }
  | { readonly kind: "saved_with_problem"; readonly videoId: string }
  | { readonly kind: "saved"; readonly videoId: string };
