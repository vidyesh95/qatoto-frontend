// TRANSPORT: client-query — addresses are session- and organization-scoped.
//
// WIRED. `GET`/`POST /commerce/organizations/:organizationId/addresses` and
// `PATCH …/addresses/:addressId`.
//
// THERE IS NO DELETE, AND THAT IS THE BACKEND'S DESIGN RATHER THAN AN OMISSION. An address can be
// referenced by an order that already shipped to it, so the row survives; a UI that offers "remove"
// would be offering something the API cannot do. Editing is how a stale address stops being used.
//
// BOTH WRITES REQUIRE AN IDEMPOTENCY KEY, minted once per attempt by the CALLER and never in here
// — a key generated inside the api function would be new on every retry, which is the one thing it
// must not be.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  OrganizationAddressListSchema,
  OrganizationAddressSchema,
  type OrganizationAddress,
  type UpsertOrganizationAddressInput,
} from "@/lib/store/addresses.schemas";

/** Every address on the organization, all kinds, ordered by kind then id. */
export function listOrganizationAddresses(
  organizationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<readonly OrganizationAddress[]>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/addresses`;
  return getJson(path, OrganizationAddressListSchema, options);
}

/**
 * Saves a new address.
 *
 * A 409 here is usually the per-kind cap (ten), not a retryable failure — surface the backend's own
 * message, which names the kind, rather than a generic "try again".
 */
export function createOrganizationAddress(
  organizationId: string,
  input: UpsertOrganizationAddressInput,
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationAddress>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/addresses`;
  return sendJson(path, "POST", input, OrganizationAddressSchema, options);
}

export function updateOrganizationAddress(
  organizationId: string,
  addressId: string,
  input: UpsertOrganizationAddressInput,
  options?: RequestOptions,
): Promise<ActionResponse<OrganizationAddress>> {
  const path = `/commerce/organizations/${encodeURIComponent(organizationId)}/addresses/${encodeURIComponent(addressId)}`;
  return sendJson(path, "PATCH", input, OrganizationAddressSchema, options);
}
