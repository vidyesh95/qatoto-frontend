// TRANSPORT: client-query — the moderator half of the product relation graph.
//
// ⚠️ **THE LIST EXISTS BECAUSE THE VERIFY ROUTE WAS UNREACHABLE WITHOUT IT.**
// `POST /commerce/admin/product-relations/:relationId/verify` shipped with no read that hands out a
// `relationId`, so no moderator could ever confirm a claim — which meant the `sourceKind` the
// buyer's companions sheet renders could only ever say "the seller says so". Third instance of that
// pattern in this module.
//
// ⚠️ **NO CAPABILITY MIDDLEWARE ON EITHER ROUTE, AND THAT IS THE POSTURE.** `moderate_commerce` is
// demanded inside the service before any row is read, so a caller without it cannot learn whether
// rows exist.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import { z } from "zod";

import { PRODUCT_RELATION_KINDS } from "@/lib/store/merchandising.schemas";
import { PRODUCT_RELATION_SOURCE_KINDS } from "@/lib/store/products.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One claim as a moderator sees it.
 *
 * ⚠️ **BOTH ENDS ARE NAMED AND THE TARGET'S STATE RIDES ALONG.** A reviewer cannot judge "does this
 * bolt fit that bicycle" from two uuids, and `toProductStatus` is how they see that the seller has
 * since unpublished the thing they claimed a fit against — a fact the public companions read
 * deliberately hides, and which a moderator needs.
 */
export const ModerationProductRelationSchema = z
  .object({
    id: z.string(),
    relationKind: z.enum(PRODUCT_RELATION_KINDS),
    sourceKind: z.enum(PRODUCT_RELATION_SOURCE_KINDS),
    createdAt: IsoDateTimeSchema,
    fromProductId: z.string(),
    fromProductTitle: z.string(),
    fromProductPublicSlug: z.string().nullable(),
    toProductId: z.string(),
    toProductTitle: z.string(),
    toProductPublicSlug: z.string().nullable(),
    toProductStatus: z.string(),
    toProductModerationState: z.string(),
    sellerOrganizationId: z.string(),
    sellerOrganizationDisplayName: z.string(),
  })
  .strip();

export type ModerationProductRelation = z.infer<typeof ModerationProductRelationSchema>;

export const ModerationProductRelationPageSchema = cursorPageOf(ModerationProductRelationSchema);

export type ModerationProductRelationPage = z.infer<typeof ModerationProductRelationPageSchema>;

/**
 * `GET /commerce/admin/product-relations` — oldest first, because it is a queue and not a feed.
 *
 * ⚠️ **UNREVIEWED IS NOW TWO CONDITIONS, NOT ONE.** The server defaults `sourceKind` to
 * `seller_declared` AND filters `dismissed_at IS NULL` — a dismissed claim has had its decision and
 * leaves the queue for good. Neither half may be expressed as "has no verification timestamp",
 * because `derived_cooccurrence` rows are un-attributed too and that predicate would pour the
 * nightly co-occurrence graph into a human's review list.
 */
export function listProductRelationsForModeration(
  filter: { readonly cursor?: string },
  options?: RequestOptions,
): Promise<ActionResponse<ModerationProductRelationPage>> {
  const path = `/commerce/admin/product-relations${buildQueryString({ ...filter })}`;
  return getJson(path, ModerationProductRelationPageSchema, options);
}

/**
 * Promotes one claim to `moderator_curated`. **Requires an `Idempotency-Key`.**
 *
 * ⚠️ **IRREVERSIBLE, FOR BOTH PARTIES.** There is exactly one UPDATE of this table in the whole
 * backend and nothing anywhere sets the source kind back, clears the attribution, or deletes a
 * curated row. The seller cannot remove it either — their replace-set is scoped to their own
 * declarations, and re-sending the edge is a 409 (`RELATION_ALREADY_CURATED`, distinct from the
 * dismissal 409 below). So the console confirms before calling.
 *
 * ⚠️ **A SECOND CALL IS A 200, NOT A 409.** The service returns the existing row for an
 * already-curated relation, so there is no "already confirmed" error path to build — the row simply
 * comes back promoted. The backend's `ALREADY_VERIFIED` member is a dead branch this never sees.
 */
export function verifyProductRelation(
  relationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<unknown>> {
  const path = `/commerce/admin/product-relations/${encodeURIComponent(relationId)}/verify`;
  return sendJson(path, "POST", {}, z.unknown(), options);
}

/**
 * Refuses one claim. **Requires an `Idempotency-Key`.**
 *
 * ⚠️ **THIS HIDES THE CLAIM FROM BUYERS, IT DOES NOT JUST TIDY THIS LIST.** The server filters
 * `dismissed_at IS NULL` on the PDP companions rail, the spare-parts reverse read and the pathway
 * candidate resolver. Dismissing is a judgement that the fit is wrong, so the copy beside this
 * control must not imply it is a "not now".
 *
 * ⚠️ **IRREVERSIBLE, AND IT BINDS THE SELLER TOO.** Nothing clears `dismissed_at`, and the seller's
 * replace-set deliberately skips dismissed rows — re-sending that edge comes back a 409 naming the
 * dismissal. They cannot re-appeal in-product, so confirm before calling.
 *
 * ⚠️ **A SECOND CALL IS A 200, NOT A 409**, matching verify: the service returns the existing row
 * for an already-dismissed relation rather than treating a re-press as an error.
 */
export function dismissProductRelation(
  relationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<unknown>> {
  const path = `/commerce/admin/product-relations/${encodeURIComponent(relationId)}/dismiss`;
  return sendJson(path, "POST", {}, z.unknown(), options);
}
