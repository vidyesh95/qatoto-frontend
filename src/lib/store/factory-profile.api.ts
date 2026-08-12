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

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
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
  SellerDeclaredProfileSchema,
  type SellerDeclaredProfile,
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
