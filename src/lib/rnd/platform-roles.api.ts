// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The (admin) layout reads `whoami` server-side to gate the console; the
// staff page reads and writes from a client island.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  PlatformRoleSubjectSchema,
  StaffContextSchema,
  type PlatformRole,
  type PlatformRoleSubject,
  type StaffContext,
} from "@/lib/rnd/platform-roles.schemas";

/**
 * The CALLER's own staff standing — role and capabilities.
 *
 * IT TAKES NO PARAMETER, and that is the point: it cannot be aimed at another account. It
 * needs no capability either, because it discloses one fact the caller already has. This is
 * what replaces guessing staff status from a 403 on some unrelated staff route, and with it
 * the UI stops treating one capability as a stand-in for another.
 *
 * `401` when signed out — including when the session outlives the user row.
 */
export function getOwnStaffContext(
  options?: RequestOptions,
): Promise<ActionResponse<StaffContext>> {
  return getJson("/admin/whoami", StaffContextSchema, options);
}

/**
 * One account by EXACT email. Requires `manage_platform_roles`.
 *
 * There is no listing and no prefix search on purpose — an admin console that could page
 * through every account is an enumeration surface. `404` when the address matches nothing;
 * `403` for a non-admin, identically for a real address and an invented one.
 */
export function lookupUserForRoleGrant(
  email: string,
  options?: RequestOptions,
): Promise<ActionResponse<PlatformRoleSubject>> {
  return getJson(
    `/admin/platform-roles/lookup${buildQueryString({ email })}`,
    PlatformRoleSubjectSchema,
    options,
  );
}

/**
 * Grants, changes or revokes a role. Requires `manage_platform_roles`.
 *
 * `role: null` REVOKES. Submitting the role the account already holds is a `200` no-op that
 * appends nothing to the audit chain.
 *
 * `409` when the target is the caller: nobody may change their own role, in either
 * direction. Ask another admin.
 */
export function setPlatformRole(
  input: { readonly email: string; readonly role: PlatformRole | null },
  options?: RequestOptions,
): Promise<ActionResponse<PlatformRoleSubject>> {
  return sendJson("/admin/platform-roles", "PUT", input, PlatformRoleSubjectSchema, options);
}
