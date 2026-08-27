// TRANSPORT: server-fetch — all three reads are public and awaited by server components.
//
// WIRED: every call below reaches the Express backend. `src/mocks/store/providers-mocks.ts` is
// deleted rather than kept as a fallback.
//
// LEGACY NOTE, kept because it is the one thing to know before touching the directory filter:
// `getJson` and drop the fixture argument for `options`.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedServiceOfferingSchema,
  MyServiceOfferingListSchema,
  ProviderDirectoryPageSchema,
  PublicProviderDetailSchema,
  PublicServiceOfferingSchema,
  type CreatedServiceOffering,
  type CreateServiceOfferingInput,
  type ListProvidersFilter,
  type ProviderDirectoryPage,
  type PublicProviderDetail,
  type PublicServiceOffering,
} from "@/lib/store/providers.schemas";

/**
 * The connector directory.
 *
 * ALL EIGHT of §9.1's filters are accepted now, alongside `limit` and `cursor` — see
 * `ListProvidersFilter`. Seven of them were a **422** until Phase 31, because `ProvidersQuerySchema`
 * is `.strict()` and an unaccepted key kills the whole read rather than degrading to an ignored
 * param. That is still the rule that matters: DO NOT ADD A CHIP WITHOUT ADDING THE QUERY KEY THERE.
 *
 * The response carries `facets` beside `items` and `page`. They describe the UNFILTERED directory,
 * not the current result set, so a buyer who has narrowed to one transport mode can still see what
 * the others would give them.
 *
 * A provider whose profile is `rejected` or `suspended` is excluded by the eligibility predicate,
 * so those two states never appear in a page even though the enum admits them.
 */
export function listStoreProviders(
  filter: ListProvidersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProviderDirectoryPage>> {
  const path = `/store/providers${buildQueryString({ ...filter })}`;
  return getJson(path, ProviderDirectoryPageSchema, options);
}

/**
 * One provider, its company depth, its measured metrics and its active offerings.
 *
 * The declared/measured split is the same invariant the seller storefront enforces:
 * `declaredProfile` is what the organization says about itself and is `null` when it has never
 * said anything; `measuredMetrics` is what the platform observed and is never null. They are two
 * objects so that flattening them into one stat list is unavailable rather than discouraged.
 */
export function getStoreProvider(
  organizationSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicProviderDetail>> {
  const path = `/store/providers/${encodeURIComponent(organizationSlug)}`;
  return getJson(path, PublicProviderDetailSchema, options);
}

/**
 * One active service offering, with its typed extension and its coverage lanes.
 *
 * The response is `{offering, provider, detail, coverage}` — `detail` is a SIBLING of `offering`,
 * and `detail.kind` is the discriminant. §9.2's example switches on `offering.providerKind`, which
 * is the same value but gives no narrowing over `detail`.
 *
 * A `draft`, `pending_review`, `suspended` or `retired` offering is a **404**, identical to one
 * that never existed — the backend narrows `state` to `"active"` on this read for that reason. Do
 * not render a "withdrawn" state from a 404.
 */
export function getStoreServiceOffering(
  offeringSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicServiceOffering>> {
  const path = `/store/services/${encodeURIComponent(offeringSlug)}`;
  return getJson(path, PublicServiceOfferingSchema, options);
}

/**
 * Every offering the caller's organization owns, DRAFTS INCLUDED.
 *
 * A session-scoped read, unlike the three above it — so it is called from a client island, not awaited in a
 * server component. It is the only place a draft or retired listing is visible: the public directory filters
 * to `active`, so without this a provider could create a draft and never see it again.
 */
export function listMyServiceOfferings(
  options?: RequestOptions,
): Promise<ActionResponse<readonly CreatedServiceOffering[]>> {
  return getJson("/commerce/providers/offerings/mine", MyServiceOfferingListSchema, options);
}

// --- Writes ----------------------------------------------------------------
//
// The three reads above are public server fetches. THIS ONE IS NOT: it is a session-scoped write called
// from a `"use client"` composer, which is why it is the only function in this file that needs an
// `Idempotency-Key`. Kept here rather than in a separate file so the create body sits beside the read it
// eventually produces — and so the two nine-arm unions stay one import apart.

/**
 * `POST /commerce/providers/:organizationId/offerings` — creates a DRAFT offering.
 *
 * IT DOES NOT PUBLISH AND IT DOES NOT SUBMIT. The row comes back `state: "draft"`, visible to nobody
 * outside the organization. `POST /service-offerings/:id/submit` moves it to `pending_review` and an admin
 * decides from there, so the success screen may not say "live" or "listed".
 *
 * THE ORGANIZATION ID IS NOT IN THE PATH HERE, deliberately. The backend mounts this route twice — once as
 * `/providers/offerings` and once as `/providers/:organizationId/offerings` — and the controller authorizes
 * the id against the ACTIVE organization either way. The frontend uses the id-free alias because the active
 * organization is server-derived from the session, and a client-supplied id is a claim rather than a fact.
 *
 * Refusals worth surfacing verbatim: a 403 when the caller's member role cannot manage offerings, and a 422
 * from the `.strict()` body — which here usually means a PAIRED RANGE was half-filled. The server accepts
 * an indicative price range and a lead-time range only as both-or-neither.
 */
export function createServiceOffering(
  input: CreateServiceOfferingInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedServiceOffering>> {
  return sendJson(
    "/commerce/providers/offerings",
    "POST",
    input,
    CreatedServiceOfferingSchema,
    options,
  );
}
