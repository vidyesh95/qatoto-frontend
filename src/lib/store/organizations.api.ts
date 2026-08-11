// TRANSPORT: server-fetch — a public read awaited by a server component.
//
// WIRED. This replaces `getOrganizationStorefront` in the legacy `src/lib/store.ts`, which read a
// second env var (`QATOTO_STORE_API_URL`) and silently fell back to a mock storefront when it was
// unset or the call failed. A seller's measured metrics are the last thing that should ever be
// fabricated, and that fallback fabricated them.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  StoreOrganizationStorefrontSchema,
  type OrganizationStorefrontView,
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
