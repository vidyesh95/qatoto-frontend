import { ApiRequestError } from "@/lib/http";
import { createEmptyUploadDraft, type UploadDraft } from "@/lib/videos/studio-view";
import type { UploadSource } from "@/components/studio/upload/upload-modal-types";

/**
 * The backend's own message, verbatim.
 *
 * A 422 here names the field the creator must fix ("Not a YouTube video link", "You can only
 * attach products you own"), and replacing that with a generic apology turns a fixable form
 * into a dead end.
 */
export function describeSaveError(error: unknown): string {
  if (error instanceof ApiRequestError) return error.apiError.message;
  return "Couldn't save this video. Please try again.";
}

export function createDraftFromSource(source: UploadSource): UploadDraft {
  const emptyDraft = createEmptyUploadDraft();
  switch (source.kind) {
    case "file":
      // No `youtubeUrl`, so this draft cannot be saved — `POST /videos` requires one. The Save
      // button surfaces the backend's refusal rather than this code inventing a link.
      return emptyDraft;
    case "youtube":
      return { ...emptyDraft, youtubeUrl: source.youtubeUrl };
    default: {
      const exhaustiveCheck: never = source;
      return exhaustiveCheck;
    }
  }
}
