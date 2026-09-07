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
import { z } from "zod";

import {
  PlatformRoleProposalSchema,
  PlatformRoleSubjectSchema,
  StaffContextSchema,
  type PlatformRole,
  type PlatformRoleProposal,
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

/** Every role change waiting for a second signature. Requires `manage_platform_roles`. */
export function listPlatformRoleProposals(
  options?: RequestOptions,
): Promise<ActionResponse<PlatformRoleProposal[]>> {
  return getJson("/admin/platform-roles/proposals", PlatformRoleProposalSchema.array(), options);
}

/**
 * Proposes a role change. Requires `manage_platform_roles`. **Changes no role.**
 *
 * `role: null` REVOKES. `201` returns a proposal, not a grant — the subject's access is
 * untouched until a different admin countersigns.
 *
 * `409` when the target is the caller, when the account already holds that role, or when one
 * proposal for them is already live.
 */
export function proposePlatformRoleChange(
  input: { readonly email: string; readonly role: PlatformRole | null; readonly note?: string },
  options?: RequestOptions,
): Promise<ActionResponse<PlatformRoleProposal>> {
  return sendJson(
    "/admin/platform-roles/proposals",
    "POST",
    input,
    PlatformRoleProposalSchema,
    options,
  );
}

/**
 * The SECOND pair of eyes — this is what actually moves the role.
 *
 * `422` when the caller proposed it: one signature is not two, and the backend says so with
 * the same rule §7A applies to a compensation statement. `409` when it is already decided, or
 * when the subject's role drifted since the proposal was raised.
 */
export function countersignPlatformRoleChange(
  proposalId: string,
  input: { readonly note?: string },
  options?: RequestOptions,
): Promise<ActionResponse<PlatformRoleSubject>> {
  return sendJson(
    `/admin/platform-roles/proposals/${encodeURIComponent(proposalId)}/countersign`,
    "POST",
    input,
    PlatformRoleSubjectSchema,
    options,
  );
}

/** Withdraws a live proposal. Any admin, not only the one who raised it. */
export function cancelPlatformRoleProposal(
  proposalId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ proposalId: string }>> {
  return sendJson(
    `/admin/platform-roles/proposals/${encodeURIComponent(proposalId)}`,
    "DELETE",
    undefined,
    z.object({ proposalId: z.string() }).strip(),
    options,
  );
}
