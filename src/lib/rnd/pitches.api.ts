// TRANSPORT: server-fetch + client-query — every function takes an optional
// `RequestOptions`, so it is callable from BOTH a server component (with the session cookie
// forwarded by `callerRequestOptions()`) and a `"use client"` island through React Query.

import { z } from "zod";

import {
  buildQueryString,
  getJson,
  getPaginated,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";
import {
  DeletedPitchSchema,
  PitchDetailSchema,
  PitchFundingOutcomeSchema,
  PitchReviewQueueEntrySchema,
  PitchSchema,
  type ListMyPitchesFilter,
  type ListPublicPitchesFilter,
  type Pitch,
  type PitchDetail,
  type PitchFundingOutcome,
  type PitchReviewQueueEntry,
} from "@/lib/rnd/pitches.schemas";

// --- Public reads ----------------------------------------------------------

/**
 * `GET /pitches` — the public discovery list.
 *
 * PUBLISHED ONLY, and there is deliberately no `status` parameter. A status facet on a
 * public list is an invitation to ask for `pending`, which would expose the review queue to
 * anyone who could type a query string. The server refuses it with `.strict()` regardless.
 */
export function listPublicPitches(
  filter: ListPublicPitchesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: Pitch[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/pitches${buildQueryString({ ...filter })}`,
    PitchSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * `GET /pitches/:pitchSlug` — one pitch and its funding record.
 *
 * The outcomes it returns are scoped BY SESSION on the server: confirmed records for
 * everyone, plus the founder's own unconfirmed ones when the founder is the caller.
 */
export function getPitch(
  pitchSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PitchDetail>> {
  return getJson(`/pitches/${encodeURIComponent(pitchSlug)}`, PitchDetailSchema, options);
}

/** `GET /pitches/slugs` — for `generateStaticParams`. Public and unauthenticated. */
export function listPublishedPitchSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/pitches/slugs", z.string().array(), options);
}

// --- Founder reads ---------------------------------------------------------

/**
 * `GET /pitches/mine` — every pitch across every venture the caller FOUNDS.
 *
 * THERE IS NO `?userId=` PARAM AND THERE MUST NOT BE ONE — the filter is `req.user.id`. A
 * client-supplied user id on a personal list is a client-supplied authorization input.
 */
export function listMyPitches(
  filter: ListMyPitchesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: Pitch[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/pitches/mine${buildQueryString({ ...filter })}`,
    PitchSchema,
    PaginationMetaSchema,
    options,
  );
}

// --- Founder writes --------------------------------------------------------

export interface CreatePitchInput {
  readonly title: string;
  readonly summary: string;
  readonly pitchVideoId?: string;
  readonly externalFundingUrl?: string;
  readonly externalContactUrl?: string;
}

/**
 * `POST /research-projects/:projectSlug/pitches` — creates a DRAFT.
 *
 * CREATING IS NOT PUBLISHING, AND IT IS NOT EVEN SUBMITTING. Two further acts stand between
 * this row and a stranger seeing it: `submitPitch`, then a moderator. No copy on the success
 * path may say live, listed or published.
 */
export function createPitch(
  projectSlug: string,
  input: CreatePitchInput,
  options?: RequestOptions,
): Promise<ActionResponse<Pitch>> {
  return sendJson(
    `/research-projects/${encodeURIComponent(projectSlug)}/pitches`,
    "POST",
    input,
    PitchSchema,
    options,
  );
}

/**
 * `PATCH /pitches/:pitchId`.
 *
 * `null` CLEARS A LINK, an absent key leaves it alone. That distinction is preserved all the
 * way to the column, and it is what lets a founder remove a funding link rather than only
 * ever add one.
 */
export interface UpdatePitchInput {
  readonly title?: string;
  readonly summary?: string;
  readonly pitchVideoId?: string | null;
  readonly externalFundingUrl?: string | null;
  readonly externalContactUrl?: string | null;
}

export function updatePitch(
  pitchId: string,
  input: UpdatePitchInput,
  options?: RequestOptions,
): Promise<ActionResponse<Pitch>> {
  return sendJson(`/pitches/${encodeURIComponent(pitchId)}`, "PATCH", input, PitchSchema, options);
}

/** `POST /pitches/:pitchId/submit` — draft or rejected → in review. */
export function submitPitch(
  pitchId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Pitch>> {
  return sendJson(
    `/pitches/${encodeURIComponent(pitchId)}/submit`,
    "POST",
    undefined,
    PitchSchema,
    options,
  );
}

/** `POST /pitches/:pitchId/close` — no longer raising. The page keeps resolving. */
export function closePitch(
  pitchId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Pitch>> {
  return sendJson(
    `/pitches/${encodeURIComponent(pitchId)}/close`,
    "POST",
    undefined,
    PitchSchema,
    options,
  );
}

/** `DELETE /pitches/:pitchId` — DRAFTS ONLY. Anything reviewed is a record; close it. */
export function deletePitch(
  pitchId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deletedPitchId: string }>> {
  return sendJson(
    `/pitches/${encodeURIComponent(pitchId)}`,
    "DELETE",
    undefined,
    DeletedPitchSchema,
    options,
  );
}

// --- Funding outcomes ------------------------------------------------------

export interface RecordPitchOutcomeInput {
  /** A DECIMAL STRING of whole cents — the column is `bigint`. Never a JS number. */
  readonly amountInCents: string;
  readonly currencyCode: string;
  readonly fundedOnDate: string;
  readonly funderUserId?: string;
  readonly funderNameText: string;
  readonly note?: string;
  readonly idempotencyKey: string;
}

/**
 * `POST /pitches/:pitchId/funding-outcomes`.
 *
 * ONE SIGNATURE OF TWO. The row this creates is the caller's account of something that
 * happened off-platform, and it stays that way until the counterparty confirms it. Nothing
 * about this call may be rendered as a completed raise.
 *
 * The idempotency key is minted ONCE PER ATTEMPT in component state and rotated after a
 * success — a second outcome that reused the key would come back as a replay of the first.
 */
export function recordPitchOutcome(
  pitchId: string,
  input: RecordPitchOutcomeInput,
  options?: RequestOptions,
): Promise<ActionResponse<PitchFundingOutcome>> {
  return sendJson(
    `/pitches/${encodeURIComponent(pitchId)}/funding-outcomes`,
    "POST",
    input,
    PitchFundingOutcomeSchema,
    options,
  );
}

/** `POST /funding-outcomes/:outcomeId/confirm` — the counterparty countersigns. */
export function confirmPitchOutcome(
  outcomeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PitchFundingOutcome>> {
  return sendJson(
    `/funding-outcomes/${encodeURIComponent(outcomeId)}/confirm`,
    "POST",
    undefined,
    PitchFundingOutcomeSchema,
    options,
  );
}

// --- Moderation ------------------------------------------------------------

/** `GET /pitches/review-queue` — `moderate_content` only; a 403 otherwise. */
export function listPitchReviewQueue(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: PitchReviewQueueEntry[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/pitches/review-queue${buildQueryString({ ...filter })}`,
    PitchReviewQueueEntrySchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * `POST /pitches/:pitchId/moderate`.
 *
 * A REJECTION REQUIRES A REASON and a publish refuses one — the body is a discriminated
 * union on the server, so the illegal pair is a 422 rather than a silently dropped field.
 */
export type ModeratePitchInput =
  | { readonly decision: "published" }
  | { readonly decision: "rejected"; readonly reason: string };

export function moderatePitch(
  pitchId: string,
  input: ModeratePitchInput,
  options?: RequestOptions,
): Promise<ActionResponse<Pitch>> {
  return sendJson(
    `/pitches/${encodeURIComponent(pitchId)}/moderate`,
    "POST",
    input,
    PitchSchema,
    options,
  );
}
