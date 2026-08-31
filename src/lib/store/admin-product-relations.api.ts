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
 * ⚠️ **THE SERVER DEFAULTS TO `seller_declared`, WHICH IS THE ONLY MEANING OF "UNREVIEWED".** There
 * is no review state on the row: a claim is unreviewed exactly while its source kind is the
 * seller's. It must never be expressed as "has no verification timestamp", because
 * `derived_cooccurrence` rows are un-attributed too and that predicate would pour the nightly
 * co-occurrence graph into a human's review list.
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
 * declarations, and re-sending the edge is a 409. So the console confirms before calling.
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
