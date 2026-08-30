// TRANSPORT: client-query — every call here is made from the seller studio island. There is no
// server component on this surface: an organization's own draft profile is session-scoped, so
// nothing about it belongs in a cached render.
//
// WIRED. `src/mocks/store/factory-profile-mocks.ts` is deleted rather than kept as a fallback.
//
// `factory-terms` CARRIED THREE DRIFTS AND EVERY ONE OF THEM WOULD HAVE 422'd OR FAILED TO PARSE:
//
//  1. THE CURRENCY KEY IS `sampleCurrency`, not `currency`. The body is `.strict()`, so the old
//     spelling was two refusals at once — an unrecognized key AND a missing required one.
//  2. ITS NULLABLE FIELDS ARE REQUIRED, NOT OPTIONAL. The backend declares them `.nullable()`
//     without `.optional()`, so an omitted `sampleLeadTimeDays` is a 422 and the only way to say
//     "unstated" is an explicit `null`. That is deliberate on a form whose whole subject is the
//     difference between unstated and zero — see §19.3's identical rule for dwell scope.
//  3. IT ANSWERS THE WHOLE DECLARED PROFILE, not a flat terms object. The service returns
//     `SellerDeclaredProfileProjection` and the controller passes it through, so `organizationId`
//     was never on the wire and the MOQ pair lives nested under `orderBounds`.
//
// ALL THREE WRITES ARE WHOLE-OBJECT PUTs, NOT PATCHES, and the two list ones mean it literally:
// the body IS the new list, an omitted row is a deletion, and array order is the stored order.
// That is not laziness about a nicer API. A per-row "move up" would have to write intermediate
// positions that violate the server's unique `(organizationId, position)` index mid-transaction —
// the same argument `admin-categories.api.ts` makes for taking a whole sibling set in one call.
//
// `factory-terms` is a PUT for a different reason, and §6.6 states it: both its invariants are
// cross-field. A sample fee is only meaningful when samples are offered, and an MOQ is only
// readable beside its unit, so a partial patch could validate neither without first reading the
// stored row and merging — which is a race against the seller's other tab.
//
// THERE IS NO GET IN THIS FILE, AND THAT IS THE BACKEND'S SHAPE RATHER THAN AN OMISSION HERE.
// §6.6 lists three PUTs and no reads: a factory's lines, sites and terms are already projected by
// `GET /store/factories/:factorySlug`, so the editor prefills from `getStoreFactory` and posts
// back through these three. Do not invent `GET /commerce/organizations/:id/production-lines` — a
// second read of the same rows is a second place for them to disagree, and §16.1 is about exactly
// that failure.

import { getJson, sendForm, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  FactoryProductionLineListSchema,
  FactorySiteListSchema,
  type FactoryProductionLine,
  type FactorySite,
  type ReplaceFactorySitesInput,
  type ReplaceProductionLinesInput,
  type UpdateFactoryTermsInput,
} from "@/lib/store/factories.schemas";
import {
  CapabilityRowListSchema,
  DeletedOrganizationMediaSchema,
  OrganizationMediaListSchema,
  OrganizationMediaSchema,
  OrganizationStakeholderSchema,
  OwnedCertificationSchema,
  SellerDeclaredProfileSchema,
  SiteAccessRowListSchema,
  StakeholderRowListSchema,
  type CapabilityRowInput,
  type OrganizationCapability,
  type OrganizationMedia,
  type OrganizationSiteAccess,
  type OrganizationStakeholder,
  type OwnedCertification,
  type ReorderOrganizationMediaInput,
  type SellerDeclaredProfile,
  type SiteAccessRowInput,
  type StakeholderRowInput,
  type SubmitCertificationInput,
  type UpsertSellerProfileInput,
} from "@/lib/store/organizations.schemas";

/**
 * `PUT /commerce/organizations/:organizationId/production-lines`.
 *
 * `monthlyCapacityUnits` MAY BE OMITTED BUT `unitLabel` MAY NOT. A capacity with no unit cannot be
 * compared against an order — the same both-or-neither shape the MOQ pair has — so the form must
 * collect the unit even when the seller does not want to state a number.
 */
export function replaceFactoryProductionLines(
  organizationId: string,
  input: ReplaceProductionLinesInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ productionLines: FactoryProductionLine[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/production-lines`;
  return sendJson(path, "PUT", input, FactoryProductionLineListSchema, options);
}

/**
 * `PUT /commerce/organizations/:organizationId/sites`.
 *
 * THESE FIGURES MAY DISAGREE WITH THE ORG-WIDE ONE, and neither the form nor the read reconciles
 * them (§16.3). Both are seller-declared; a platform that quietly summed the per-site areas into
 * the org total, or overwrote one from the other, would be asserting something neither party said.
 */
export function replaceFactorySites(
  organizationId: string,
  input: ReplaceFactorySitesInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ sites: FactorySite[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/sites`;
  return sendJson(path, "PUT", input, FactorySiteListSchema, options);
}

/**
 * `PUT /commerce/organizations/:organizationId/factory-terms`.
 *
 * `sampleFeeInCents` OMITTED IS UNSTATED AND `0` IS FREE — two different facts, and the form must
 * offer them as two different answers. A buyer who reads an unstated fee as free finds out at
 * invoice time, which is the one failure this whole object exists to prevent.
 */
export function updateFactoryTerms(
  organizationId: string,
  input: UpdateFactoryTermsInput,
  options?: RequestOptions,
): Promise<ActionResponse<SellerDeclaredProfile>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/factory-terms`;
  return sendJson(path, "PUT", input, SellerDeclaredProfileSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;

// --- Seller profile writes (A13) --------------------------------------------
//
// The nine seller-facing writes whose routes had no caller at all — an organization could be
// DESCRIBED on its storefront and could not describe itself. They live here rather than in a new
// file because they share the prefix and the row: `factory-terms` above already writes
// `commerce_seller_profile` and already answers the whole `SellerDeclaredProfile` back.
//
// ⚠️ **EVERY ONE NEEDS AN `Idempotency-Key` HEADER**, and its absence is a **400** rather than a 422 —
// a refusal, not a default. The caller mints one per attempt and rotates it only on success.
//
// ⚠️ **A REFUSAL IS A 404, INCLUDING FOR THE WRONG ROLE.** These routes carry no org guard;
// `requireMembershipRole` runs inside the service and answers `NOT_FOUND` both for a non-member and
// for a member whose role is below owner/administrator, so the status cannot be used as a membership
// oracle. Render the backend's own sentence rather than "no such organization".
//
// ⚠️ **THERE IS STILL NO SELLER-SIDE READ OF THE PROFILE.** `loadSellerDeclaredProfiles` has three
// callers and all three are public browse reads, gated on `tradeState = 'active' AND visibility =
// 'public'`. So the editor prefills from the storefront read, and an organization that is private or
// not yet active cannot open it at all. `GET …/certifications` below is the module's only
// authenticated read.

/** `PATCH …/seller-profile` — a SPARSE patch; an omitted key is untouched, an explicit null clears. */
export function upsertSellerProfile(
  organizationId: string,
  input: UpsertSellerProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<SellerDeclaredProfile>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/seller-profile`;
  return sendJson(path, "PATCH", input, SellerDeclaredProfileSchema, options);
}

/**
 * `PUT …/site-access` — the whole freight-access list.
 *
 * ⚠️ **DELETE-THEN-INSERT: an omitted row is DESTROYED, and the surviving rows get NEW ids.** There is
 * no `state` column and no revive, so this is stricter than a variant or a customization slot — a
 * caller must send back every row it is keeping, and must refuse rather than silently drop one.
 */
export function replaceOrganizationSiteAccess(
  organizationId: string,
  rows: readonly SiteAccessRowInput[],
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: OrganizationSiteAccess[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/site-access`;
  return sendJson(path, "PUT", { rows }, SiteAccessRowListSchema, options);
}

/**
 * `PUT …/stakeholders` — the whole officer list, IDENTITY-PRESERVING.
 *
 * ⚠️ **ECHO THE `id` OF EVERY ROW BEING KEPT** or its uploaded portrait is orphaned: the photo lives
 * on the row, and an unrecognised id is treated as a new row rather than refused.
 *
 * ⚠️ **DEDUPE BEFORE SENDING.** A repeated `id` collapses two rows into one server-side, silently,
 * and the response comes back short — quiet data loss rather than an error.
 */
export function replaceOrganizationStakeholders(
  organizationId: string,
  rows: readonly StakeholderRowInput[],
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: OrganizationStakeholder[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/stakeholders`;
  return sendJson(path, "PUT", { rows }, StakeholderRowListSchema, options);
}

/**
 * `POST …/stakeholders/:stakeholderId/photo` — one portrait, multipart, field `photo`, 5 MB.
 *
 * SEPARATE FROM THE LIST WRITE ON PURPOSE. Migration `0091` removed `photoUrl` from the list body, so
 * a portrait cannot be set by URL — which is what stops a client naming an image it does not own.
 */
export function uploadStakeholderPhoto(
  organizationId: string,
  stakeholderId: string,
  photoFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationStakeholder>> {
  const formData = new FormData();
  formData.append("photo", photoFile);
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/stakeholders/${encodeURIComponent(stakeholderId)}/photo`;
  // ONE ROW BACK, not the gallery and not the profile — the caller patches it into its own list.
  return sendForm(path, "POST", formData, OrganizationStakeholderSchema, options);
}

/**
 * `PUT …/capabilities` — the whole capability list. Delete-then-insert, like site access.
 *
 * ⚠️ **A KIND MAY APPEAR ONCE.** A repeat is a 409 rather than a dedupe, so the form must not offer
 * a kind it already holds.
 */
export function replaceOrganizationCapabilities(
  organizationId: string,
  rows: readonly CapabilityRowInput[],
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: OrganizationCapability[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/capabilities`;
  return sendJson(path, "PUT", { rows }, CapabilityRowListSchema, options);
}

/**
 * `POST …/media` — one company photo, multipart, field `image`, 8 MB. Answers **201**.
 *
 * ⚠️ **NOT A SCAN FLOW.** Unlike a trade document this is 201 rather than 202: the image is
 * re-encoded and stored, and nothing here may tell a seller their photo is "being checked".
 * The twelfth photo is a **409 `MEDIA_LIMIT_REACHED`**, counted inside the transaction.
 */
export function addOrganizationMedia(
  organizationId: string,
  imageFile: File,
  mediaKind: string,
  altText: string | undefined,
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationMedia>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("mediaKind", mediaKind);
  if (altText !== undefined) formData.append("altText", altText);
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/media`;
  // ONE ROW BACK — the photo just added, not the gallery it joined.
  return sendForm(path, "POST", formData, OrganizationMediaSchema, options);
}

/**
 * `PATCH …/media/reorder` — an EXACT COVER of the current gallery.
 *
 * ⚠️ **EVERY CURRENT IMAGE, EXACTLY ONCE.** A missing, extra or duplicated id is a 409 rather than a
 * partial reorder, so this must never be sent from a stale gallery.
 */
export function reorderOrganizationMedia(
  organizationId: string,
  input: ReorderOrganizationMediaInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ media: OrganizationMedia[] }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/media/reorder`;
  // `{ media }`, not `{ rows }` — the one list write that does not use the shared key.
  return sendJson(path, "PATCH", input, OrganizationMediaListSchema, options);
}

/** `DELETE …/media/:mediaId` — removes one photo and its stored asset. */
export function deleteOrganizationMedia(
  organizationId: string,
  mediaId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: true }>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/media/${encodeURIComponent(mediaId)}`;
  // A bare acknowledgement — the surviving gallery is NOT returned, so the caller drops the row.
  return sendJson(path, "DELETE", undefined, DeletedOrganizationMediaSchema, options);
}

/**
 * `GET …/certifications` — the seller's own list, every state.
 *
 * THE MODULE'S ONLY AUTHENTICATED READ, and it exists for four fields rather than for more rows:
 * `state`, `decisionReason`, `submittedAt` and `decidedAt`. The public projection ships only
 * approved, unexpired rows and renames `decidedAt` to `approvedAt`.
 */
export function listOrganizationCertifications(
  organizationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OwnedCertification[]>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/certifications`;
  return getJson(path, OwnedCertificationSchema.array(), options);
}

/**
 * `POST …/certifications` — the claim AND its evidence in one multipart request. Answers **201**.
 *
 * ⚠️ **201, NOT 202, AND THE DISTINCTION MATTERS TWICE OVER.** The certification row lands `pending`
 * — a moderator has not seen it — while its evidence document lands `pending_scan` and is promoted to
 * `available` by an async scan. Those are two independent lifecycles: **promotion is not approval**,
 * and no copy may imply a review has happened because a file finished scanning.
 *
 * ⚠️ **THE EVIDENCE NEVER RIDES BACK.** Neither projection carries a document id, URL or token, in
 * either direction.
 *
 * ⚠️ **`standardCode` CANNOT BE SET FROM HERE, and that is a backend gap rather than an omission in
 * this wrapper.** The service writes the column, but the route's schema has no such key and is
 * `.strict()`, and the controller never passes one — so every certification created through this
 * route has `standardCode: null`, and the manufacturer directory's certification filter can never
 * match one.
 */
export function submitOrganizationCertification(
  organizationId: string,
  evidenceFile: File,
  input: SubmitCertificationInput,
  options?: RequestOptions,
): Promise<ActionResponse<OwnedCertification>> {
  const formData = new FormData();
  formData.append("evidence", evidenceFile);
  formData.append("standardName", input.standardName);
  formData.append("issuerName", input.issuerName);
  formData.append("certificateNumber", input.certificateNumber);
  if (input.scopeSummary !== undefined) formData.append("scopeSummary", input.scopeSummary);
  formData.append("validFrom", input.validFrom);
  formData.append("validUntil", input.validUntil);
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/certifications`;
  return sendForm(path, "POST", formData, OwnedCertificationSchema, options);
}
