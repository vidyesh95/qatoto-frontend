// TRANSPORT: server-fetch + client-query — the public storefront read is awaited by a server
// component; the two workspace calls are made from a client island via the optional
// `RequestOptions`.
//
// WIRED. This replaces `getOrganizationStorefront` in the legacy `src/lib/store.ts`, which read a
// second env var (`QATOTO_STORE_API_URL`) and silently fell back to a mock storefront when it was
// unset or the call failed. A seller's measured metrics are the last thing that should ever be
// fabricated, and that fallback fabricated them.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  MyCommerceOrganizationListSchema,
  MyCommerceOrganizationSchema,
  StoreOrganizationStorefrontSchema,
  type MyCommerceOrganization,
  type MyCommerceOrganizationMembership,
  type OrganizationStorefrontView,
  type UpdateCommerceOrganizationInput,
} from "@/lib/store/organizations.schemas";

/** Cursor over the storefront's PRODUCT list — the storefront header itself is not paginated. */
export interface StorefrontFilter {
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * A seller's public storefront — `GET /store/organizations/:organizationSlug`.
 *
 * TWO OBJECTS, NOT ONE, and keeping them apart is the whole point of the shape.
 * `declaredProfile` is what the seller says about itself (founded 2009, four factories) and is
 * `null` when it has never described itself — which is a different fact from describing itself
 * and leaving the form blank. `measuredMetrics` is what the platform observed (on-time rate,
 * completed orders) and is never null; an organization with no orders has honest zeros and nulls
 * with their sample sizes. Never render the two through one code path.
 *
 * `frontendOnlyProfile` is always `null` here and that is correct: registered capital, the
 * per-site factory addresses and the factory-visit schedule and fee have no columns on
 * `commerce_seller_profile`. The member survives so the sections that read it degrade rather than
 * disappear — see the type's own comment for the columns each would need.
 *
 * A 404 means "no such storefront" OR "not visible to you". One code, two facts; the caller runs
 * `notFound()` and never renders a permission hint from it.
 */
export async function getOrganizationStorefront(
  organizationSlug: string,
  filter: StorefrontFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationStorefrontView>> {
  const path = `/store/organizations/${encodeURIComponent(organizationSlug)}${buildQueryString({ ...filter })}`;
  const result = await getJson(path, StoreOrganizationStorefrontSchema, options);
  if (!result.success) return result;
  return { success: true, data: { ...result.data, frontendOnlyProfile: null } };
}

/**
 * Every commerce organization the caller is an ACTIVE member of —
 * `GET /commerce/organizations/mine`.
 *
 * `requireAuth` only, no organization context, so it is the one workspace read a caller with
 * nothing but a `pending` shell can still make. That is what makes it the right read to decide
 * what the checkout may offer.
 *
 * IT RETURNS AN EMPTY ARRAY, NOT A 404, for a caller who belongs to nothing — and an empty list
 * is a real answer rather than an error. A signed-in visitor who has never touched the cart has
 * no workspace at all: the server mints one on their first cart call
 * (`requireProvisionedBuyerCommerceWorkspace`), not on this read.
 *
 * Memberships in `invited`, `suspended` or `left` state are filtered out server-side, so every
 * row here is one the caller can currently act through.
 */
export function listMyCommerceOrganizations(
  options?: RequestOptions,
): Promise<ActionResponse<MyCommerceOrganizationMembership[]>> {
  return getJson("/commerce/organizations/mine", MyCommerceOrganizationListSchema, options);
}

/**
 * Edits the caller's own organization — `PATCH /commerce/organizations/:organizationId`.
 *
 * REQUIRES AN `Idempotency-Key` HEADER, minted once per attempt by the caller and passed through
 * `options.headers`. Absent, the middleware answers **400**, not 422 — a different branch from
 * every body refusal on this surface, so do not render it through the field-error path.
 *
 * SENDING `countryCode` IS NOT A PROFILE EDIT, and this is the whole reason the function exists.
 * An auto-provisioned shell is minted with no country (A37), and
 * `commerce_organization_country_pending_ck` will not let it reach `active` without one — so
 * until this is sent, `checkout/confirm` answers 403 forever and no other route can fix it.
 * Sending it also flips `provisioningOrigin` to `self_declared`, because naming a country IS the
 * act of asking a moderator to review the organization. It does not activate anything: the
 * `pending → active` transition is `moderate_commerce`-gated and belongs to staff.
 *
 * The body is `.strict()` and needs at least one key, so an empty patch is a 422 naming that.
 * `countryCode` is `^[A-Z]{2}$` — an uppercase ISO-3166-1 alpha-2 code, and a lowercase one is a
 * 422 rather than a coerced value.
 */
export function updateCommerceOrganization(
  organizationId: string,
  input: UpdateCommerceOrganizationInput,
  options?: RequestOptions,
): Promise<ActionResponse<MyCommerceOrganization>> {
  return sendJson(
    `/commerce/organizations/${encodeURIComponent(organizationId)}`,
    "PATCH",
    input,
    MyCommerceOrganizationSchema,
    options,
  );
}
