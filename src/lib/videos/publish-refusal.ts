// TRANSPORT: props-only — pure classification of a publish failure. No network.
//
// PUBLISH HAS FOUR DISTINCT REFUSALS AND THEY MEAN FOUR DIFFERENT THINGS. Collapsing them into
// one "couldn't publish" line is how a creator ends up staring at a button that never works:
// one of the four resolves itself if you wait, one names a field to fill in, one needs a
// setting changed, and one means the media is broken.
//
// The backend chose its status codes deliberately (`studio-error-response.ts:251-262` explains
// the 409-vs-422 split at length), so this file reads them rather than re-deciding.

import { ApiRequestError, type ApiError } from "@/lib/http";

export type PublishRefusal =
  /** `SOURCE_NOT_VERIFIED`. Nothing to fix — `verify-youtube-video` is still retrying. */
  | { readonly kind: "still_verifying"; readonly message: string }
  /** `INCOMPLETE_FOR_PUBLISH`. `missingFields` names what to fill in. */
  | { readonly kind: "incomplete"; readonly message: string; readonly missingFields: string[] }
  /** Gating, NOT_READY, 403, or anything else. The backend's own message is the best copy. */
  | { readonly kind: "failed"; readonly message: string };

/**
 * Human labels for the fields `errors.missing` can name.
 *
 * `isMadeForKids` is the one that actually happens: the create schema defaults
 * `hasAgeRestriction` but NOT this, so a creator who skipped the audience question has it as
 * `null`, and `null` — meaning "not answered" — is what blocks publish. Rendering the raw
 * camelCase key would tell them nothing about which control to go back to.
 */
const MISSING_FIELD_LABELS: Record<string, string> = {
  title: "a title",
  youtubeUrl: "a YouTube link",
  isMadeForKids: "the “made for kids” answer",
  anime: "the anime episode details",
};

function toMissingFieldLabel(fieldName: string): string {
  return MISSING_FIELD_LABELS[fieldName] ?? fieldName;
}

/**
 * Classifies a failed publish.
 *
 * The 409/422 split is load-bearing. `SOURCE_NOT_VERIFIED` is a 409 precisely because there is
 * no input to correct — the row is complete and the link is fine, YouTube just has not answered
 * yet — so the UI must offer "try again", not "fix something". Treating it as a validation
 * error would send the creator hunting through four wizard steps for a problem that is not
 * theirs.
 */
export function describePublishRefusal(error: unknown): PublishRefusal {
  if (!(error instanceof ApiRequestError)) {
    return { kind: "failed", message: "Couldn't publish this video. Please try again." };
  }

  const apiError: ApiError = error.apiError;
  const missingFields = apiError.fieldErrors?.missing;

  if (apiError.code === "409" && apiError.message.includes("confirming this video")) {
    return { kind: "still_verifying", message: apiError.message };
  }

  if (missingFields !== undefined && missingFields.length > 0) {
    return {
      kind: "incomplete",
      // The backend's own "This video is not complete enough to publish." plus the fields,
      // because the generic sentence alone sends the creator looking without a destination.
      message: `${apiError.message} Add ${missingFields.map(toMissingFieldLabel).join(", ")}.`,
      missingFields: [...missingFields],
    };
  }

  return { kind: "failed", message: apiError.message };
}

/**
 * Why the publish control is disabled BEFORE anything is sent, or `null` when it is not.
 *
 * THE VISIBILITY CHECK IS THE IMPORTANT ONE, and it is not obvious: `publishVideo` writes
 * `publishStatus` and NEVER touches `visibility` (`videos.service.ts:1687-1706`). Publishing a
 * private video therefore SUCCEEDS with a 200 and changes nothing a viewer can see — the row
 * reads "Published" in the studio and the feed's `v.visibility = 'public'` still filters it
 * out. That is exactly the "my video isn't on the homepage" bug, one layer down, and the only
 * place to catch it is here, before the request.
 *
 * `isMadeForKids` deliberately is NOT checked: it is not on `VideoListRow` (thirteen fields,
 * and that is not one of them), so the row cannot know. Its 422 is surfaced after the attempt.
 */
export function describePublishBlock(video: {
  readonly visibility: string;
  readonly uploadStatus: string;
}): string | null {
  if (video.visibility !== "public") {
    return "Set visibility to Public first — publishing a private video won't make it visible.";
  }
  if (video.uploadStatus !== "ready") {
    return "This video is still processing.";
  }
  return null;
}
