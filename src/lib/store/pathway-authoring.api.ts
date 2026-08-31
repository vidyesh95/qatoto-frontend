// TRANSPORT: client-query — the seven authoring routes for a curated product set.
//
// ⚠️ **EVERY WRITE HERE REQUIRES AN `Idempotency-Key` (400 without one), AND THE SCOPE IS `user`,
// NOT `active_organization`.** That is deliberate on the backend: a platform merchandiser curating
// a cross-seller set has no seller organization to scope to, and scoping to one would 403 them out
// of their own job.
//
// ⚠️ **THE WRITE LIMITER IS 30 PER MINUTE AND A FULL SAVE COSTS `1 + slotCount` REQUESTS** — one
// `PUT …/slots` plus one candidate PUT per slot. The backend caps a set at 100 slots, so a maximal
// save is 101 requests against a 30/minute budget. `savePathwayPlan` below therefore runs
// sequentially and reports where it stopped, rather than firing everything at once and leaving the
// caller to guess which half landed.

import { sendForm, sendJson, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  PathwayAuthoringPageSchema,
  PathwayAuthoringSchema,
  type CreatePathwayInput,
  type PathwayAuthoring,
  type PathwayAuthoringPage,
  type PathwayCandidateInput,
  type PathwayImageSlot,
  type PathwaySlotInput,
  type UpdatePathwayInput,
} from "@/lib/store/pathway-authoring.schemas";

/** `POST /commerce/pathways` — **201**, answering a `draft`. */
export function createPathway(
  input: CreatePathwayInput,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  return sendJson("/commerce/pathways", "POST", input, PathwayAuthoringSchema, options);
}

/**
 * `GET /commerce/pathways/mine` — the only read that returns a draft.
 *
 * Keyset, so the cursor is the server's own opaque token: echo it back, never build one.
 */
export function listAuthoredPathways(
  filter: { readonly cursor?: string },
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoringPage>> {
  const query = filter.cursor === undefined ? "" : `?cursor=${encodeURIComponent(filter.cursor)}`;
  return getJson(`/commerce/pathways/mine${query}`, PathwayAuthoringPageSchema, options);
}

/**
 * `PATCH /commerce/pathways/:pathwayId` — sparse.
 *
 * ⚠️ **`slug` IS NOT ACCEPTED HERE.** The body is `.strict()` and has no such key, so sending one
 * is a 422 rather than a silent no-op. A slug is a public URL identity, fixed at creation.
 */
export function updatePathway(
  pathwayId: string,
  patch: UpdatePathwayInput,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const path = `/commerce/pathways/${encodeURIComponent(pathwayId)}`;
  return sendJson(path, "PATCH", patch, PathwayAuthoringSchema, options);
}

/**
 * `POST /commerce/pathways/:pathwayId/images/:imageSlot` (multipart, field name `image`, 8 MB).
 *
 * ⚠️ **ITS OWN ROUTE RATHER THAN PART OF THE PATCH, AND THAT IS THE RIGHT SHAPE.** Folding a file
 * into the metadata call would make "leave the image alone" an ABSENT multipart part — the
 * ambiguity that quietly clears a column. `replaceStoreCategoryImage` states the same reasoning.
 *
 * Needs a saved pathway, so the editor cannot offer it until the set exists.
 */
export function replacePathwayImage(
  pathwayId: string,
  imageSlot: PathwayImageSlot,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  const path = `/commerce/pathways/${encodeURIComponent(pathwayId)}/images/${imageSlot}`;
  return sendForm(path, "POST", formData, PathwayAuthoringSchema, options);
}

/**
 * `PUT /commerce/pathways/:pathwayId/slots` — replaces the WHOLE plan.
 *
 * ⚠️ **THIS CASCADE-DELETES EVERY CANDIDATE UNDER THE PATHWAY, INCLUDING ON SLOTS YOU DID NOT
 * TOUCH.** Slots are hard delete-then-insert (a unique index on `(pathwayId, siblingOrder)` means
 * an in-place reorder would collide with itself), and `store_pathway_slot_candidate.slotId` is
 * `onDelete: "cascade"`. So renaming ONE slot's label destroys the candidates on all the others.
 *
 * ⚠️ **THEREFORE THERE IS NO SAFE PER-SLOT SAVE, AND NO UI MAY OFFER ONE.** Use `savePathwayPlan`,
 * which re-sends every slot's candidates afterwards. Sending this route on its own is a data-loss
 * bug wearing the clothes of a partial update.
 *
 * Identity is POSITIONAL — the body carries no `id` and `.strict()` refuses one. The response's
 * slots come back ordered by `siblingOrder`, which the server set from the array index, so
 * `response.slots[i]` is the row for `slots[i]`.
 */
export function replacePathwaySlots(
  pathwayId: string,
  slots: readonly PathwaySlotInput[],
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const path = `/commerce/pathways/${encodeURIComponent(pathwayId)}/slots`;
  return sendJson(path, "PUT", { slots }, PathwayAuthoringSchema, options);
}

/**
 * `PUT /commerce/pathways/:pathwayId/slots/:slotId/candidates` — replaces one slot's candidates.
 *
 * The refusals worth surfacing verbatim, because two of them are about the reader's choice rather
 * than a bug: `VARIANT_REQUIRED` (the product has active variants and none was named),
 * `VARIANT_NOT_APPLICABLE` (a variant was named for a product that has none), `VARIANT_NOT_FOUND`.
 * Each carries the offending ids in the error payload.
 */
export function replacePathwaySlotCandidates(
  pathwayId: string,
  slotId: string,
  candidates: readonly PathwayCandidateInput[],
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const path = `/commerce/pathways/${encodeURIComponent(pathwayId)}/slots/${encodeURIComponent(slotId)}/candidates`;
  return sendJson(path, "PUT", { candidates }, PathwayAuthoringSchema, options);
}

/**
 * `POST /commerce/pathways/:pathwayId/submit` — `draft`/`rejected` → `pending_review`.
 *
 * ⚠️ Refuses a set with no slots, and a REQUIRED slot with no candidates unless the slot derives
 * its own. Both arrive as `INVALID_STATE` and are distinguishable only by the message, so render
 * the server's sentence rather than mapping the code to copy of our own.
 *
 * Re-submitting something already `pending_review` is an idempotent no-op that returns BEFORE
 * revalidating, so it is not a way to re-check completeness.
 */
export function submitPathway(
  pathwayId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PathwayAuthoring>> {
  const path = `/commerce/pathways/${encodeURIComponent(pathwayId)}/submit`;
  return sendJson(path, "POST", {}, PathwayAuthoringSchema, options);
}

/** How far a plan save got, so a caller can say which slots landed rather than "it failed". */
export interface PathwayPlanSaveProgress {
  readonly phase: "slots" | "candidates";
  readonly slotIndex?: number;
  readonly slotCount?: number;
}

/**
 * THE ONLY SAFE WAY TO SAVE A PLAN: slots, then every slot's candidates against the NEW ids.
 *
 * Sequential on purpose. The write limiter is 30/minute and this costs `1 + slotCount` requests, so
 * firing them in parallel buys nothing and makes a 429 arrive as a scatter of unrelated failures.
 * Stopping at the first failure and reporting the index is what lets the caller say "slots 1-3 were
 * saved, slot 4 was not" instead of leaving a half-written plan unexplained.
 *
 * A partial save is at least LOUD rather than silent: `submitPathway` refuses a required slot with
 * no candidates, so a plan that failed halfway cannot be published by accident.
 */
export async function savePathwayPlan(
  pathwayId: string,
  slots: readonly {
    readonly slot: PathwaySlotInput;
    readonly candidates: readonly PathwayCandidateInput[];
  }[],
  makeIdempotencyKey: () => string,
  onProgress?: (progress: PathwayPlanSaveProgress) => void,
): Promise<ActionResponse<PathwayAuthoring>> {
  onProgress?.({ phase: "slots" });
  const slotsResult = await replacePathwaySlots(
    pathwayId,
    slots.map((entry) => entry.slot),
    { headers: { "Idempotency-Key": makeIdempotencyKey() } },
  );
  if (!slotsResult.success) return slotsResult;

  let latest = slotsResult.data;
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
    const savedSlot = latest.slots[slotIndex];
    // The response is ordered by `siblingOrder`, which the server set from the index — so a short
    // response means the server kept fewer slots than were sent, and inventing an id for the
    // missing one would write candidates onto the wrong slot. Stop instead.
    if (savedSlot === undefined) break;

    const entry = slots[slotIndex];
    if (entry === undefined) break;

    onProgress?.({ phase: "candidates", slotIndex, slotCount: slots.length });
    const candidatesResult = await replacePathwaySlotCandidates(
      pathwayId,
      savedSlot.id,
      entry.candidates,
      { headers: { "Idempotency-Key": makeIdempotencyKey() } },
    );
    if (!candidatesResult.success) return candidatesResult;
    latest = candidatesResult.data;
  }

  return { success: true, data: latest };
}
