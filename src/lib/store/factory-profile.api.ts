// TRANSPORT: client-query — every call here is made from the seller studio island. There is no
// server component on this surface: an organization's own draft profile is session-scoped, so
// nothing about it belongs in a cached render.
//
// MOCK-BACKED: every call resolves a fixture. The endpoints exist —
// `STORE_BACKEND_STRUCTURE.md` §6.6 records Phase 17 as shipped — so wiring is one edit per
// function: swap `resolveMockRead` for `getJson` (or the write for `sendJson`) and drop the fixture
// argument for `options`.
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
  FactoryTermsSchema,
  type FactoryProductionLine,
  type FactorySite,
  type FactoryTerms,
  type ReplaceFactorySitesInput,
  type ReplaceProductionLinesInput,
  type UpdateFactoryTermsInput,
} from "@/lib/store/factories.schemas";
import { resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_FACTORY_PRODUCTION_LINE_LIST,
  MOCK_FACTORY_SITE_LIST,
  MOCK_FACTORY_TERMS,
} from "@/mocks/store/factory-profile-mocks";

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
  void input;
  return resolveMockRead(
    path,
    FactoryProductionLineListSchema,
    options,
    MOCK_FACTORY_PRODUCTION_LINE_LIST,
  );
  // return sendJson(path, "PUT", input, FactoryProductionLineListSchema, options);
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
  void input;
  return resolveMockRead(path, FactorySiteListSchema, options, MOCK_FACTORY_SITE_LIST);
  // return sendJson(path, "PUT", input, FactorySiteListSchema, options);
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
): Promise<ActionResponse<FactoryTerms>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/factory-terms`;
  void input;
  return resolveMockRead(path, FactoryTermsSchema, options, MOCK_FACTORY_TERMS);
  // return sendJson(path, "PUT", input, FactoryTermsSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;
