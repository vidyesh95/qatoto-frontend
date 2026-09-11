// TRANSPORT: client-query — the maker's side of showcase launches, against the Express backend:
// posting a launch, uploading an image for its write-up, and listing the maker's own launches.
//
// ⚠️ SEPARATE FROM `showcase-moderation.api.ts`, on the case-study precedent, so moderator calls never
// land in a public or studio bundle.
//
// ⚠️ NOTHING HERE IS OPTIMISTIC AND NOTHING POLLS. A posted launch is `pending_review`; a moderator
// decides, and the maker sees the decision the next time My Launches loads.
//
// ⚠️ THE PUBLIC SHOWCASE PAGES DO NOT READ WHAT IS POSTED HERE YET. They still render fixtures through
// `@/lib/blueprints/api`, which is why a published launch has no page to link to.

import { z } from "zod";

import { BlueprintWriteUpImageSchema, type BlueprintWriteUpImage } from "@/lib/blueprints/schemas";
import {
  ShowcaseSubmissionReceiptSchema,
  ShowcaseSubmissionSchema,
  type ShowcaseSubmission,
  type ShowcaseSubmissionDraft,
  type ShowcaseSubmissionReceipt,
} from "@/lib/blueprints/showcase-authoring.schemas";
import { getJson, sendForm, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `POST /blueprints/showcases` (multipart) — post a launch for review. Answers 201 with a receipt.
 *
 * ⚠️ THE `draft` PART GOES FIRST, THEN THE FILE. The server allows exactly one text part and streams
 * the body in order; a draft sent after the file is still read, but first is the order its contract
 * documents.
 *
 * ⚠️ `idempotencyKey` IS THE CALLER'S, minted once per attempt and kept across a retry of that
 * attempt. The server fingerprints the draft AND the image bytes, so the same key with a changed
 * draft or a different image is a 409, which is why the composer rotates it on any edit.
 */
export function submitShowcaseForReview(
  submissionRequest: {
    readonly draft: ShowcaseSubmissionDraft;
    readonly headingImageFile: File;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseSubmissionReceipt>> {
  const formData = new FormData();
  formData.append("draft", JSON.stringify(submissionRequest.draft));
  formData.append("headingImage", submissionRequest.headingImageFile);

  return sendForm("/blueprints/showcases", "POST", formData, ShowcaseSubmissionReceiptSchema, {
    ...options,
    headers: { ...options?.headers, "Idempotency-Key": submissionRequest.idempotencyKey },
  });
}

/**
 * `POST /blueprints/showcases/write-up-images` (multipart, field `image`) — one image for the
 * write-up, stored before the launch exists. Answers with the stored address and the size the server
 * measured, which the preview needs to reserve the image's box.
 *
 * ⚠️ NO IDEMPOTENCY KEY, because the route takes none. A retried upload stores a second copy that no
 * launch references, and the server deletes unreferenced uploads after a day.
 */
export function uploadShowcaseWriteUpImage(
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintWriteUpImage>> {
  const formData = new FormData();
  formData.append("image", imageFile);

  return sendForm(
    "/blueprints/showcases/write-up-images",
    "POST",
    formData,
    BlueprintWriteUpImageSchema,
    options,
  );
}

/** `GET /blueprints/showcases/mine` — every launch the signed-in maker has posted, newest first. */
export function listMyShowcaseSubmissions(
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseSubmission[]>> {
  return getJson("/blueprints/showcases/mine", z.array(ShowcaseSubmissionSchema), options);
}
