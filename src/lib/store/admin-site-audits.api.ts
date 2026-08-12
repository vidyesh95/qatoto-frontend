// TRANSPORT: client-query — every call here is made from the admin console island.
//
// WIRED. `src/mocks/store/factory-profile-mocks.ts` is deleted with this module.
//
// THE LIST WRAPS AND THE TWO WRITES DO NOT. `GET …/site-audits` answers `{ siteAudits: [...] }` —
// note the key, which this module called `audits` — while `record` and `withdraw` each answer a
// SINGLE BARE audit row. All three were parsed as `{ audits: [...] }`, so none of them worked.
//
// LEGACY NOTE — the endpoints exist —
// `STORE_BACKEND_STRUCTURE.md` §6.6 records Phase 17 as shipped — so wiring is one edit per
// function: swap `resolveMockRead` for `getJson` (or the write for `sendJson`) and drop the fixture
// argument for `options`.
//
// WHAT THESE THREE ROUTES ARE FOR, because it is the whole reason `site_audited` may exist. Before
// Phase 17 the wire carried a verification state asserting that somebody had stood in the building
// with NO RECORD BEHIND IT ANYWHERE — `commerce_organization_verification` covers registration,
// tax, identity, address and bank account, which is paperwork, all of it. §16.2's third conflict
// offered two ways out: drop the state, or build the record. The record was built.
//
// TWO RULES THAT LIVE HERE RATHER THAN IN A COMPONENT:
//
//  1. AN AUDIT IS NEVER DERIVED FROM A DOCUMENT REVIEW. There is no route that promotes a
//     `documents_reviewed` organization to `site_audited`, and there must never be one — that is
//     the precise collapse the three-state enum exists to prevent, letting a paper review carry
//     the weight of somebody's visit.
//
//  2. NONE OF THIS REACHES A BUYER. The public detail read projects `lastAuditedAt` and nothing
//     else: publishing an auditor's name and the scope they covered on a browse page is a
//     disclosure about a third party who never agreed to it.
//
// Gated by `moderate_commerce`, checked in-service. A refusal is therefore a tagged result the UI
// can render, not an opaque 403 — the same call Phase 16 made for the category console.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  FactorySiteAuditListSchema,
  FactorySiteAuditSchema,
  type FactorySiteAudit,
  type RecordSiteAuditInput,
  type WithdrawSiteAuditInput,
} from "@/lib/store/factories.schemas";

/** `GET /commerce/admin/organizations/:organizationId/site-audits` — every audit, withdrawn ones included. */
export function listOrganizationSiteAudits(
  organizationId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ siteAudits: FactorySiteAudit[] }>> {
  const path = `/commerce/admin/organizations/${encodeURIComponent(organizationId)}/site-audits`;
  return getJson(path, FactorySiteAuditListSchema, options);
}

/**
 * `POST /commerce/admin/organizations/:organizationId/site-audits`.
 *
 * Requires an `Idempotency-Key`, minted once per attempt. A retry without one records the same
 * visit twice, and two rows for one audit make `lastAuditedAt` look like a cadence nobody kept.
 */
export function recordOrganizationSiteAudit(
  organizationId: string,
  input: RecordSiteAuditInput,
  options?: RequestOptions,
): Promise<ActionResponse<FactorySiteAudit>> {
  const path = `/commerce/admin/organizations/${encodeURIComponent(organizationId)}/site-audits`;
  return sendJson(path, "POST", input, FactorySiteAuditSchema, options);
}

/**
 * `POST /commerce/admin/site-audits/:auditId/withdraw`.
 *
 * THE REASON IS REQUIRED. Retracting an audit removes a platform claim a buyer may have relied on
 * when they chose this factory, and a retraction nobody has to justify is one nobody can review.
 */
export function withdrawOrganizationSiteAudit(
  auditId: string,
  input: WithdrawSiteAuditInput,
  options?: RequestOptions,
): Promise<ActionResponse<FactorySiteAudit>> {
  const path = `/commerce/admin/site-audits/${encodeURIComponent(auditId)}/withdraw`;
  return sendJson(path, "POST", input, FactorySiteAuditSchema, options);
}
