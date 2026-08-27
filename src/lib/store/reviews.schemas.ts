// TRANSPORT: props-only — schemas and request types for review authoring. No network of its own.
//
// Client contract for the buyer's half of trust: `GET /commerce/completions`,
// `POST /commerce/completions/:completionId/reviews`, `PATCH /commerce/reviews/:reviewId`, and the
// three media routes.
//
// Transcribed from `commerce-trust.service.ts` — `BuyerCompletionProjection`, `ReviewProjection`
// and `ReviewMediaProjection`.
//
// WHY THIS FILE DID NOT EXIST UNTIL NOW, because it explains an absence people kept rediscovering:
// the ONLY review code anywhere in this app was the public READ on the product page
// (`listStoreProductReviews`). Every write route had shipped and none had a caller, so the product
// page's "Reviews can only be left by a buyer whose order completed" was true in a way nobody
// intended — no buyer could leave one either.
//
// `GET /commerce/completions` is the read that unlocks the rest. Its own service comment is blunt
// about why it was added: `completionId` "was projected on NOTHING, so a buyer had no way to obtain
// the id the route demands. Ratings, review photos and review videos were all reachable only by
// guessing a UUID."
//
// FOUR RULES THE UI MUST HONOUR RATHER THAN ASSUME:
//
//  1. `shipping` IS MEANINGLESS ON A SERVICE ENGAGEMENT — nothing shipped. Sending it there is a 422
//     `UNSUPPORTED_SCORE_AXIS`, refused under the lock the service already holds on the completion
//     row, so the axis is offered only for a product completion.
//
//  2. `hasReview` COUNTS HIDDEN REVIEWS. The unique index behind it carries no partial predicate, so
//     a moderator-hidden review still occupies the slot. Reporting a row as reviewable because its
//     review is hidden would offer a write the server refuses.
//
//  3. THE EDIT IS SINGLE-USE AND TOTAL. `rating` AND `body` are both required — not a patch — so a
//     caller sending only `body` would spend the one edit and silently keep a rating they may have
//     meant to change. `editedAt` is projected publicly on purpose: a rewritten review that does not
//     say it was rewritten is the manipulation, not the edit.
//
//  4. MEDIA POSITION IS THE SERVER'S. There are no text fields on the photo upload at all — the
//     multipart body is `z.object({}).strict()` — because media is appended at the current count and
//     the gallery is re-packed on removal. A client-chosen position collides with a unique index.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Completions -------------------------------------------------------------

export const COMPLETION_TARGET_KINDS = ["product", "service_engagement"] as const;

export type CompletionTargetKind = (typeof COMPLETION_TARGET_KINDS)[number];

/**
 * One completed piece of trade this buyer organization may review.
 *
 * `hasReview` IS A FACT ABOUT THE CALLER, never about the completion — another organization's review
 * must not make a completion look spent.
 */
export const BuyerCompletionSchema = z
  .object({
    completionId: z.string(),
    targetKind: z.enum(COMPLETION_TARGET_KINDS),
    orderId: z.string(),
    // Null for a service engagement: there is no product behind it.
    productId: z.string().nullable(),
    counterpartyOrganization: z
      .object({
        organizationId: z.string(),
        slug: z.string(),
        displayName: z.string(),
      })
      .strip(),
    completedAt: IsoDateTimeSchema,
    hasReview: z.boolean(),
  })
  .strip();

export type BuyerCompletion = z.infer<typeof BuyerCompletionSchema>;

/** `{ items, page: { nextCursor, hasMore } }`. */
export const BuyerCompletionPageSchema = z
  .object({
    items: z.array(BuyerCompletionSchema),
    page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }).strip(),
  })
  .strip();

export interface ListBuyerCompletionsFilter {
  readonly reviewable?: boolean;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- The review itself ---------------------------------------------------------

export const REVIEW_SCORE_AXES = ["service", "shipping", "quality"] as const;

export type ReviewScoreAxis = (typeof REVIEW_SCORE_AXES)[number];

export const REVIEW_SCORE_AXIS_LABELS: Record<ReviewScoreAxis, string> = {
  service: "Service",
  shipping: "Shipping",
  quality: "Quality",
};

export const ReviewScoreEntrySchema = z
  .object({
    axis: z.enum(REVIEW_SCORE_AXES),
    score: z.number().int(),
  })
  .strip();

/**
 * The AUTHOR-FACING review projection, which the write routes answer with.
 *
 * It keeps `completionId` because it goes back to the organization that owns that completion; the
 * PUBLIC projection on the product page deliberately drops it.
 *
 * `visibility` can be `hidden` — a moderator acted. The author still sees the row, which is right:
 * it is theirs, and it still occupies their one review slot on that completion.
 */
export const AuthoredReviewSchema = z
  .object({
    id: z.string(),
    completionId: z.string(),
    subjectOrganizationId: z.string(),
    productId: z.string().nullable(),
    rating: z.number().int(),
    body: z.string(),
    visibility: z.enum(["visible", "hidden"]),
    helpfulCount: z.number().int(),
    mediaCount: z.number().int(),
    scores: z.array(ReviewScoreEntrySchema),
    editedAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export type AuthoredReview = z.infer<typeof AuthoredReviewSchema>;

/**
 * One attached photo or video, as the AUTHOR sees it.
 *
 * `state` IS THE WHOLE REASON THIS PROJECTION DIFFERS FROM THE PUBLIC ONE. The public read filters
 * `unavailable_upstream` rows out entirely and carries no state at all; the author gets the state,
 * because a buyer whose video died deserves to be told rather than finding an empty slot where they
 * remember attaching something — and only they can replace it.
 *
 * ONLY A `youtube_video` CAN BECOME UNAVAILABLE. A photo is a first-party asset; the state is moved
 * by the YouTube revalidation job, never by a route.
 */
export const AuthoredReviewMediaSchema = z
  .object({
    id: z.string(),
    reviewId: z.string(),
    mediaKind: z.enum(["photo", "youtube_video"]),
    url: z.string().nullable(),
    youtubeVideoId: z.string().nullable(),
    widthPx: z.number().int().nullable(),
    heightPx: z.number().int().nullable(),
    position: z.number().int(),
    state: z.enum(["visible", "unavailable_upstream"]),
    unavailableAt: IsoDateTimeSchema.nullable(),
  })
  .strip();

export type AuthoredReviewMedia = z.infer<typeof AuthoredReviewMediaSchema>;

/** `DELETE /commerce/reviews/:reviewId/media/:mediaId` answers with the surviving count. */
export const DetachedReviewMediaSchema = z
  .object({ reviewId: z.string(), mediaCount: z.number().int() })
  .strip();

export type DetachedReviewMedia = z.infer<typeof DetachedReviewMediaSchema>;

/**
 * The six-photo cap, mirrored from `MAXIMUM_REVIEW_MEDIA_COUNT`.
 *
 * Enforced three ways on the backend — the service check, a counter CHECK and a position CHECK — so
 * this copy is a UX affordance only. It exists so the control can disable itself with a sentence
 * rather than let someone pick a file and then read a 422.
 */
export const MAXIMUM_REVIEW_MEDIA_COUNT = 6;

// --- Request bodies ------------------------------------------------------------
//
// TS types, not Zod schemas, for the reason `rfqs.schemas.ts:356-359` gives: the bodies are
// `.strict()`, so the compiler is what stops a wrong field name and a runtime re-parse of an object
// we just built would only re-check itself.

/**
 * Per-axis scores. AT LEAST ONE AXIS, or omit `scores` entirely — an empty object is refused.
 *
 * `shipping` ONLY ON A PRODUCT COMPLETION. See rule 1 in the header.
 */
export interface ReviewScoresInput {
  readonly service?: number;
  readonly shipping?: number;
  readonly quality?: number;
}

export interface CreateReviewInput {
  readonly rating: number;
  readonly body: string;
  readonly scores?: ReviewScoresInput;
}

/**
 * The one edit, and BOTH FIELDS ARE REQUIRED.
 *
 * NO `scores`. The per-axis scores are their own rows and were optional at creation, so accepting
 * them here would make an omitted `scores` ambiguous between "leave them" and "clear them" on the
 * one write that cannot be repeated.
 */
export interface EditOwnReviewInput {
  readonly rating: number;
  readonly body: string;
}

/** A review video is a YouTube LINK. The id is extracted server-side, never sent as a bare id. */
export interface AttachReviewVideoInput {
  readonly youtubeUrl: string;
}
