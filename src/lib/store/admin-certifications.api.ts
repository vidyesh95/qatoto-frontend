// TRANSPORT: client-query — the staff certification console at `/admin/certifications`.
//
// WHY THIS FILE EXISTS AT ALL. `POST /commerce/admin/certifications/:id/decision` shipped without
// a queue beside it: there was no route that listed a pending certification, so no moderator could
// learn an id, so nothing was ever approved — and the manufacturer directory's certification
// filter, which matches only APPROVED rows carrying a `standardCode`, therefore matched nothing on
// a surface where both halves looked finished. The list route is the missing half.
//
// TWO RULES THAT LIVE HERE RATHER THAN IN THE COMPONENT:
//
//  1. **THE EVIDENCE NEVER RIDES THIS WIRE.** No projection on this surface — public, seller or
//     moderator — carries an evidence document id, URL or token. A certificate carries
//     registration numbers, site addresses and signatures; the moderator reads it through the
//     document surface that audits the read, and this queue must never become a second, unaudited
//     way to reach it.
//  2. **A DECISION IS FINAL AND NOT OPTIMISTIC.** Approving publishes a compliance claim to every
//     buyer browsing the directory; rejecting refuses one with a reason the seller reads verbatim.
//     Neither may be rendered before the server has said it happened, and a `409` means the row was
//     already decided — a finding to surface, not a retry.
//
// Gated by `moderate_commerce`, checked in-service before any id is read, so a caller without the
// capability gets a refusal rather than an existence oracle.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  ModerationCertificationPageSchema,
  type CertificationDecisionInput,
  type ModerationCertificationPage,
  type ModerationCertificationQuery,
} from "@/lib/store/admin-certifications.schemas";
import {
  OwnedCertificationSchema,
  type OwnedCertification,
} from "@/lib/store/organizations.schemas";

/**
 * `GET /commerce/admin/certifications` — the queue, oldest first.
 *
 * `state` DEFAULTS TO `pending` ON THE SERVER, not here. Omitting it asks for the queue; passing
 * one asks for a specific state, and both are legitimate — a moderator checking what they approved
 * last week is reading the same table.
 */
export function listCertificationsForModeration(
  query: ModerationCertificationQuery = {},
  options?: RequestOptions,
): Promise<ActionResponse<ModerationCertificationPage>> {
  const path = `/commerce/admin/certifications${buildQueryString({ ...query })}`;
  return getJson(path, ModerationCertificationPageSchema, options);
}

/**
 * `POST /commerce/admin/certifications/:certificationId/decision`.
 *
 * A REJECTION CARRIES ITS REASON AND AN APPROVAL CANNOT — the body is a discriminated union on
 * `kind`, and the backend's schema is `.strict()`, so a `decisionReason` sent beside
 * `kind: "approve"` is a 422 rather than an ignored field. The seller reads the reason verbatim in
 * their own console, which is the only reason a refused claim is not simply resubmitted unchanged.
 *
 * ⚠️ **A MODERATOR CANNOT DECIDE A CERTIFICATION THEY SUBMITTED.** The service refuses a
 * self-review, so a staff member who is also a seller sees their own claim in this queue and cannot
 * act on it — that refusal is correct and must be shown, not hidden by filtering the row out.
 *
 * IT ANSWERS THE SELLER'S PROJECTION, NOT THE QUEUE'S — one decided row with no organization block,
 * because the caller already knows which row it acted on. Parsing it as a queue row would be a
 * `PARSE` result that looks like a refused decision.
 */
export function decideOrganizationCertification(
  certificationId: string,
  input: CertificationDecisionInput,
  options?: RequestOptions,
): Promise<ActionResponse<OwnedCertification>> {
  const path = `/commerce/admin/certifications/${encodeURIComponent(certificationId)}/decision`;
  return sendJson(path, "POST", input, OwnedCertificationSchema, options);
}
