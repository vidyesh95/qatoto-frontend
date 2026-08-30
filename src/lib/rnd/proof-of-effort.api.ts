// TRANSPORT: server-fetch + client-query — every function takes an optional
// `RequestOptions`, so it is callable from BOTH sides. A server component must route
// through `@/lib/server-http` to forward the session cookie; a client hook calls these
// directly because the browser attaches cookies itself.
//
// EVERY ROUTE HERE IS `requireAuth` PLUS PROJECT MEMBERSHIP, and a non-member is refused
// with **`404`, not `403`** — the same answer a slug that does not exist gets, so a
// stranger cannot probe which projects are real. Route the failure through
// `toMemberScopedListViewState`, which is allowed to render "members only" ONLY because
// the page already resolved the project through its public detail read.
//
// THE WRITES IN THE SECOND HALF ARE THE FIRST WRITES IN THIS DOMAIN. Four of them answer
// **`202`** rather than a verdict — claim submit, re-verify, receipt upload, and a
// `re_verified` dispute resolution — and none of their results exists at the moment the
// response arrives. Render `AsyncJobViewState.accepted` and poll; never an optimistic
// number.

import {
  buildQueryString,
  getCursorSiblingList,
  getJson,
  getSequenceSiblingList,
  sendForm,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  AllocationProposalSchema,
  AuditEntrySchema,
  AuthorizeUrlSchema,
  ChainVerificationSchema,
  ClaimDetailSchema,
  ClaimSummarySchema,
  DisputeSchema,
  EquitySnapshotSchema,
  FairMarketRateSchema,
  HashInputSchema,
  IntegrationGrantSchema,
  LedgerEntrySchema,
  OpenRoleProjectionSchema,
  OptimizationSuggestionSchema,
  OverrideQueueRowSchema,
  PhysicalReceiptSchema,
  PieBakeSchema,
  ProofOfEffortSummarySchema,
  type AllocationProposal,
  type AllocationProposalStatus,
  type AuditEntry,
  type AuthorizeUrl,
  type ChainVerification,
  type ClaimDetail,
  type ClaimSummary,
  type Dispute,
  type DisputeResolution,
  type DisputeStatus,
  type DisputeVotePosition,
  type EffortClaimSourceKind,
  type EquitySnapshot,
  type FairMarketRate,
  type HashInput,
  type IntegrationGrant,
  type IntegrationProvider,
  type LedgerEntry,
  type ListClaimsFilter,
  type OpenRoleProjection,
  type OptimizationSuggestion,
  type OverrideQueueRow,
  type PhysicalReceipt,
  type PhysicalReceiptKind,
  type PieBake,
  type PieBakeTrigger,
  type ProofOfEffortSummary,
  type VerificationStepStatus,
} from "@/lib/rnd/proof-of-effort.schemas";

function projectPath(projectSlug: string, suffix: string): string {
  return `/research-projects/${projectSlug}${suffix}`;
}

// --- Reads --------------------------------------------------------------------

/**
 * The page's opening read: latest snapshot, open proposals, recent ledger entries and the
 * open-role projection, in one request.
 *
 * `equity` is null when no snapshot exists. That is a project with no cap table, not a
 * cap table of zeroes.
 */
export function getProofOfEffortSummary(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProofOfEffortSummary>> {
  return getJson(projectPath(projectSlug, "/proof-of-effort"), ProofOfEffortSummarySchema, options);
}

/** The history of nightly recalculations, newest first. */
export function listEquitySnapshots(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<EquitySnapshot[]>> {
  return getJson(
    projectPath(projectSlug, "/equity/snapshots"),
    EquitySnapshotSchema.array(),
    options,
  );
}

/** The ghost segment that replaces the reserve pool — outside the denominator (§9.5). */
export function listOpenRoleProjection(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<OpenRoleProjection[]>> {
  return getJson(
    projectPath(projectSlug, "/equity/open-role-projection"),
    OpenRoleProjectionSchema.array(),
    options,
  );
}

/**
 * A page of the append-only ledger, ordered by `sequenceNumber` ASC.
 *
 * PAGINATED FOR A REASON: a two-year-old project has thousands of entries, and the
 * pre-wire mock modelled this as one flat unbounded array.
 *
 * ADVANCE WITH `fromSequence`, NOT `page`. This is an append-only table, which is exactly
 * the shape where OFFSET drifts: an entry written between two page fetches shifts every
 * later page by one and the reader silently skips a row. On a slice ledger that row is
 * somebody's equity. `page` still works and is kept only for back-compat; `fromSequence`
 * wins when both arrive.
 */
export function listSliceLedger(
  projectSlug: string,
  filter: {
    readonly page?: number;
    readonly limit?: number;
    readonly fromSequence?: number;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: LedgerEntry[]; nextSequence: number | null }>> {
  return getSequenceSiblingList(
    projectPath(projectSlug, `/slice-ledger${buildQueryString({ ...filter })}`),
    LedgerEntrySchema,
    options,
  );
}

/**
 * One member's full effective-dated rate history.
 *
 * THERE IS NO PROJECT-WIDE RATE LIST. The only rate read is this per-member one, so a
 * roster-wide rate panel costs one request per member. Recorded as a gap in
 * `R_AND_D_BACKEND_STRUCTURE.md` Appendix D (backend repo — see `docs/BACKEND_DOCS.md`).
 */
export function listMemberFairMarketRates(
  projectSlug: string,
  memberUserId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FairMarketRate[]>> {
  return getJson(
    projectPath(projectSlug, `/members/${memberUserId}/fair-market-rate`),
    FairMarketRateSchema.array(),
    options,
  );
}

/**
 * The verification index. ANY MEMBER SEES ANY MEMBER'S CLAIMS — that is §9's transparency
 * posture, not an oversight: people sharing a pie can audit what everyone else was
 * credited for.
 *
 * `?status=flagged_for_review` NARROWS THIS LIST TO FLAGGED CLAIMS. It is not the review
 * queue — `listOverrideQueue` below is, and this comment used to deny that route existed.
 * The difference is the unit: a claim can hold one answered step and one still waiting, so
 * a claim-level filter shows a reviewer work that is already done and hides work that is
 * not.
 *
 * DUAL MODE. Without a `cursor` the backend serves an offset page and returns a
 * `pagination` block; with one it serves a keyset page and drops that block rather than
 * reporting a total it did not count. Either way `nextCursor` comes back, which is what
 * lets a first request — which has no cursor by definition — bootstrap into keyset mode.
 */
export function listEffortClaims(
  projectSlug: string,
  filter: ListClaimsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ClaimSummary[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    projectPath(projectSlug, `/effort-claims${buildQueryString({ ...filter })}`),
    ClaimSummarySchema,
    options,
  );
}

/**
 * `GET …/override-queue` — the steps awaiting a human (EU AI Act Art. 14).
 *
 * ⚠️ **THIS FILE PREVIOUSLY ASSERTED THIS ROUTE DID NOT EXIST**, and `verification-pipeline-tab.tsx`
 * repeated the claim in prose. It has existed since the domain shipped —
 * `proof-of-effort.routes.ts` declares it a literal one segment under `/:projectSlug` — and
 * only the client wrapper was missing. Read a comment asserting a route's absence as a claim
 * to check against the router.
 *
 * NOT PAGINATED AND NOT A FEED. It answers a bare array capped by `?limit=` (backend default
 * 50, maximum 200), oldest first, because a queue is worked from the front: the oldest
 * unanswered flag is the one whose member has been waiting longest on equity that is not
 * being minted. A cursor over a list that shrinks as it is worked would page over holes.
 *
 * MEMBER-SCOPED like every read here, at `contributor` and above. Answering a row still
 * needs `maintainer` — `overrideVerificationStep` is the write, and the queue deliberately
 * shows a contributor what is pending without granting them the answer.
 */
export function listOverrideQueue(
  projectSlug: string,
  filter: { readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<OverrideQueueRow[]>> {
  return getJson(
    projectPath(projectSlug, `/override-queue${buildQueryString({ ...filter })}`),
    OverrideQueueRowSchema.array(),
    options,
  );
}

/** One claim with every run, every step in `stepOrder`, and its evidence. */
export function getEffortClaim(
  projectSlug: string,
  claimId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ClaimDetail>> {
  return getJson(projectPath(projectSlug, `/effort-claims/${claimId}`), ClaimDetailSchema, options);
}

/**
 * The dispute-window ledger.
 *
 * ADVANCE WITH `cursor` — `<epochMs>_<id>` over `(windowClosesAt, id)`, echoed back
 * verbatim from the previous page's `nextCursor`. Never send it with `page`, and never
 * build one from a row: the epoch half depends on a column precision the backend owns.
 */
export function listAllocationProposals(
  projectSlug: string,
  filter: {
    readonly status?: AllocationProposalStatus;
    readonly page?: number;
    readonly limit?: number;
    readonly cursor?: string;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: AllocationProposal[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    projectPath(projectSlug, `/allocation-proposals${buildQueryString({ ...filter })}`),
    AllocationProposalSchema,
    options,
  );
}

/**
 * The disputes list — the read that makes the contestability path renderable at all.
 *
 * Raise, vote, withdraw and resolve all shipped before it, which left a dispute reachable
 * only as an `activeDisputeId` on a proposal: an id and nothing else.
 */
export function listDisputes(
  projectSlug: string,
  filter: { readonly status?: DisputeStatus; readonly page?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<Dispute[]>> {
  return getJson(
    projectPath(projectSlug, `/disputes${buildQueryString({ ...filter })}`),
    DisputeSchema.array(),
    options,
  );
}

export function getDispute(
  projectSlug: string,
  disputeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Dispute>> {
  return getJson(projectPath(projectSlug, `/disputes/${disputeId}`), DisputeSchema, options);
}

/** Caller-scoped: a member sees their own receipts, exactly as the detail read is. */
export function listPhysicalReceipts(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PhysicalReceipt[]>> {
  return getJson(
    projectPath(projectSlug, "/physical-receipts"),
    PhysicalReceiptSchema.array(),
    options,
  );
}

export function listIntegrationGrants(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<IntegrationGrant[]>> {
  return getJson(
    projectPath(projectSlug, "/integrations"),
    IntegrationGrantSchema.array(),
    options,
  );
}

export function listOptimizationSuggestions(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<OptimizationSuggestion[]>> {
  return getJson(
    projectPath(projectSlug, "/optimization-suggestions"),
    OptimizationSuggestionSchema.array(),
    options,
  );
}

/**
 * A page of the hash chain. IT MUST PAGE — `?fromSequence=` / `?toSequence=` exist
 * because a chain grows without bound and a single unbounded read of it is a timeout
 * waiting to happen.
 */
export function listAuditTrail(
  projectSlug: string,
  filter: {
    readonly fromSequence?: number;
    readonly toSequence?: number;
    readonly limit?: number;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: AuditEntry[]; nextSequence: number | null }>> {
  return getSequenceSiblingList(
    projectPath(projectSlug, `/audit-trail${buildQueryString({ ...filter })}`),
    AuditEntrySchema,
    options,
  );
}

/**
 * Re-walks the chain.
 *
 * A BREAK COMES BACK AS `409 CHAIN_BROKEN`, never as `200 { valid: false }`. So a failed
 * result here is not "verification returned false" — it is an operational emergency, and
 * the UI must say so rather than rendering a grey checkbox.
 */
export function verifyAuditChain(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ChainVerification>> {
  return getJson(projectPath(projectSlug, "/audit-trail/verify"), ChainVerificationSchema, options);
}

/** The exact bytes that were hashed, so a reader can recompute the hash themselves. */
export function getAuditHashInput(
  projectSlug: string,
  entryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<HashInput>> {
  return getJson(
    projectPath(projectSlug, `/audit-trail/${entryId}/hash-input`),
    HashInputSchema,
    options,
  );
}

/**
 * The frozen cap table.
 *
 * **`404` BEFORE THE BAKE IS AN ABSENCE, NOT AN ERROR** — a project with a dynamic pie has
 * no frozen one. Route it through `toMemberScopedItemViewState`, which renders both "not a
 * member" and "never happened" as the same honest absence.
 */
export function getPieBake(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PieBake>> {
  return getJson(projectPath(projectSlug, "/pie-bake"), PieBakeSchema, options);
}

// --- Writes -------------------------------------------------------------------

export interface ProposeRateInput {
  /** Decimal STRING cents. Never a JS number — see the schemas file's rule 1. */
  readonly fairMarketRateCentsPerHour: string;
  readonly paidCashRateCentsPerHour: string;
  readonly effectiveFrom: string;
  readonly rationaleNote: string;
}

/**
 * The founder proposes a rate. THE ONE PLACE A RATE LEGITIMATELY ENTERS VIA A BODY — it is
 * a negotiated input, not a derived value.
 *
 * NO `currencyCode`: it is derived from the project. A client-chosen currency would let a
 * $120/h rate be re-read as ¥120/h. `409 RETROACTIVE_RATE_CHANGE` when it would re-price
 * hours already logged.
 */
export function proposeFairMarketRate(
  projectSlug: string,
  memberUserId: string,
  input: ProposeRateInput,
  options?: RequestOptions,
): Promise<ActionResponse<FairMarketRate>> {
  return sendJson(
    projectPath(projectSlug, `/members/${memberUserId}/fair-market-rate`),
    "POST",
    input,
    FairMarketRateSchema,
    options,
  );
}

/**
 * THE MEMBER accepts. Without this step the founder both sets and ratifies the number,
 * which is founder fiat — and §13 describes §0's exception as a member-ACCEPTED rate.
 */
export function acceptFairMarketRate(
  projectSlug: string,
  memberUserId: string,
  rateId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FairMarketRate>> {
  return sendJson(
    projectPath(projectSlug, `/members/${memberUserId}/fair-market-rate/${rateId}/accept`),
    "POST",
    undefined,
    FairMarketRateSchema,
    options,
  );
}

/** Immutable after. `409 RATE_ALREADY_LOCKED`, and claims cannot be filed before it. */
export function lockFairMarketRate(
  projectSlug: string,
  input: { readonly rateId: string; readonly acknowledgement: string },
  options?: RequestOptions,
): Promise<ActionResponse<FairMarketRate>> {
  return sendJson(
    projectPath(projectSlug, "/fair-market-rate/lock"),
    "POST",
    input,
    FairMarketRateSchema,
    options,
  );
}

export interface SubmitClaimInput {
  readonly sourceKind: EffortClaimSourceKind;
  readonly dailyLogId?: string;
  readonly physicalReceiptIds: readonly string[];
  readonly claimedForDate: string;
  readonly narrative?: string;
  readonly idempotencyKey: string;
}

/**
 * Submit a claim. **`202`** — accepted, not graded.
 *
 * NO MINUTES, NO CASH, NO VERDICT, NO SLICES IN THE BODY. That is §0: the client says what
 * it did and points at evidence; the server derives every number. A form field asking for
 * hours would be the whole design failing in one input.
 *
 * `409 RATE_NOT_LOCKED` when no locked rate exists to price it against. `429` is rate
 * limiting, and the idempotency key is what makes a retry safe.
 */
export function submitEffortClaim(
  projectSlug: string,
  input: SubmitClaimInput,
  options?: RequestOptions,
): Promise<ActionResponse<ClaimDetail>> {
  return sendJson(
    projectPath(projectSlug, "/effort-claims"),
    "POST",
    input,
    ClaimDetailSchema,
    options,
  );
}

/** `202`. Produces attempt 2, 3, … — never replaces attempt 1. `409 CLAIM_SETTLED`. */
export function reverifyEffortClaim(
  projectSlug: string,
  claimId: string,
  input: { readonly reason: string },
  options?: RequestOptions,
): Promise<ActionResponse<ClaimDetail>> {
  return sendJson(
    projectPath(projectSlug, `/effort-claims/${claimId}/reverify`),
    "POST",
    input,
    ClaimDetailSchema,
    options,
  );
}

/**
 * THE ONLY HAND-EDIT IN THE DOMAIN — and it edits an AI JUDGEMENT, not a number.
 *
 * A maintainer overrides a step's status; the formula then recomputes the minutes. This is
 * the EU AI Act Art. 14 human-oversight control, and it is deliberately shaped so a human
 * cannot type in an outcome: there is no minutes field on this request and there must
 * never be one.
 */
export function overrideVerificationStep(
  projectSlug: string,
  claimId: string,
  stepId: string,
  input: { readonly overriddenStatus: VerificationStepStatus; readonly overrideReason: string },
  options?: RequestOptions,
): Promise<ActionResponse<ClaimDetail>> {
  return sendJson(
    projectPath(projectSlug, `/effort-claims/${claimId}/steps/${stepId}/override`),
    "PATCH",
    input,
    ClaimDetailSchema,
    options,
  );
}

/**
 * Upload a receipt. MULTIPART, and **`202`**.
 *
 * Size, content hash, perceptual hash and pixel dimensions are all SERVER-MEASURED — the
 * client sends bytes and a kind, nothing else. `409 DUPLICATE_RECEIPT` on a near-duplicate
 * image, `413` when it is too large.
 */
export function uploadPhysicalReceipt(
  projectSlug: string,
  receiptFile: File,
  input: { readonly receiptKind: PhysicalReceiptKind; readonly idempotencyKey: string },
  options?: RequestOptions,
): Promise<ActionResponse<PhysicalReceipt>> {
  const formData = new FormData();
  formData.append("receipt", receiptFile);
  formData.append("receiptKind", input.receiptKind);
  formData.append("idempotencyKey", input.idempotencyKey);

  return sendForm(
    projectPath(projectSlug, "/physical-receipts"),
    "POST",
    formData,
    PhysicalReceiptSchema,
    options,
  );
}

/** Uploader only, and refused once cited by a claim — `409 RECEIPT_CITED`. The bytes are
 * evidence at that point. */
export function deletePhysicalReceipt(
  projectSlug: string,
  receiptId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PhysicalReceipt>> {
  return sendJson(
    projectPath(projectSlug, `/physical-receipts/${receiptId}`),
    "DELETE",
    undefined,
    PhysicalReceiptSchema,
    options,
  );
}

/**
 * Raise a dispute. Any active member, inside the window — `409 WINDOW_CLOSED` after.
 *
 * THE GDPR Art. 22 CONTESTABILITY PATH. Freezes the proposal's slices in escrow, reported
 * separately from the snapshot's totals rather than folded into them.
 */
export function raiseDispute(
  projectSlug: string,
  proposalId: string,
  input: { readonly disputeNote: string; readonly idempotencyKey: string },
  options?: RequestOptions,
): Promise<ActionResponse<Dispute>> {
  return sendJson(
    projectPath(projectSlug, `/allocation-proposals/${proposalId}/dispute`),
    "POST",
    input,
    DisputeSchema,
    options,
  );
}

/** One vote per voter; a simple majority of the FROZEN quorum auto-resolves. */
export function castDisputeVote(
  projectSlug: string,
  disputeId: string,
  input: { readonly position: DisputeVotePosition; readonly note?: string },
  options?: RequestOptions,
): Promise<ActionResponse<Dispute>> {
  return sendJson(
    projectPath(projectSlug, `/disputes/${disputeId}/votes`),
    "POST",
    input,
    DisputeSchema,
    options,
  );
}

/** The raiser withdraws. The original window resumes on its ORIGINAL clock. */
export function withdrawDispute(
  projectSlug: string,
  disputeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<Dispute>> {
  return sendJson(
    projectPath(projectSlug, `/disputes/${disputeId}/withdraw`),
    "POST",
    undefined,
    DisputeSchema,
    options,
  );
}

export interface ResolveDisputeInput {
  readonly resolution: DisputeResolution;
  readonly resolutionNote: string;
  readonly scopedWindowStart?: string;
  readonly scopedWindowEnd?: string;
}

/**
 * Resolve.
 *
 * `upheld` and `voided` answer `200`; **`re_verified` answers `202`** because the number
 * does not exist yet — a scoped re-verification has to run first. `409 EVIDENCE_PURGED`
 * when a consent revocation removed what the re-run would need.
 *
 * THERE IS NO `consensusAdjustedMinutes` AND THERE MUST NOT BE. A human-supplied number
 * overruling the formula is majority fiat wearing a quorum; §9.12 settled this as option
 * (a) and §9.1 exists to rule the alternative out.
 */
export function resolveDispute(
  projectSlug: string,
  disputeId: string,
  input: ResolveDisputeInput,
  options?: RequestOptions,
): Promise<ActionResponse<Dispute>> {
  return sendJson(
    projectPath(projectSlug, `/disputes/${disputeId}/resolve`),
    "POST",
    input,
    DisputeSchema,
    options,
  );
}

/**
 * Begin an OAuth connection.
 *
 * The `state` is SIGNED, SINGLE-USE and 10-MINUTE — identity on the callback comes out of
 * it, not out of a session, because a provider's redirect carries no cookie of ours.
 * `503 INTEGRATION_UNCONFIGURED` means this deployment holds no credentials (or no
 * encryption key) for that provider, and must render as "not available here" rather than
 * as a failure the member can retry.
 */
export function buildIntegrationAuthorizeUrl(
  projectSlug: string,
  provider: IntegrationProvider,
  input: { readonly requestedResourceIds: readonly string[] },
  options?: RequestOptions,
): Promise<ActionResponse<AuthorizeUrl>> {
  return sendJson(
    projectPath(projectSlug, `/integrations/${provider}/authorize-url`),
    "POST",
    input,
    AuthorizeUrlSchema,
    options,
  );
}

/** Revoke. SELF ONLY — nobody revokes another member's grant. The stored token is
 * destroyed and any evidence payload it fetched is purged; the hashes survive. */
export function revokeIntegrationGrant(
  projectSlug: string,
  provider: IntegrationProvider,
  options?: RequestOptions,
): Promise<ActionResponse<IntegrationGrant>> {
  return sendJson(
    projectPath(projectSlug, `/integrations/${provider}`),
    "DELETE",
    undefined,
    IntegrationGrantSchema,
    options,
  );
}

export function acceptOptimizationSuggestion(
  projectSlug: string,
  suggestionId: string,
  input: { readonly note?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<OptimizationSuggestion>> {
  return sendJson(
    projectPath(projectSlug, `/optimization-suggestions/${suggestionId}/accept`),
    "POST",
    input,
    OptimizationSuggestionSchema,
    options,
  );
}

export function dismissOptimizationSuggestion(
  projectSlug: string,
  suggestionId: string,
  input: { readonly note?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<OptimizationSuggestion>> {
  return sendJson(
    projectPath(projectSlug, `/optimization-suggestions/${suggestionId}/dismiss`),
    "POST",
    input,
    OptimizationSuggestionSchema,
    options,
  );
}

export interface BakePieInput {
  readonly trigger: PieBakeTrigger;
  readonly triggerEvidenceNote: string;
  readonly valuationCents?: string;
  readonly acknowledgement: string;
  /**
   * Echoed back from the snapshot the founder was actually looking at. Without it a
   * bake races the nightly recompute and freezes a cap table nobody reviewed —
   * `409 SNAPSHOT_STALE` is only reachable because this field exists.
   */
  readonly expectedSnapshotId: string;
}

/**
 * Bake the pie. IRREVERSIBLE, ONCE PER PROJECT, EVER.
 *
 * `409 UNSETTLED_ALLOCATIONS` when a dispute window is still open — settle them and come
 * back. There is NO unbake endpoint: recovery is a manual, audited, out-of-band
 * operation, so no control anywhere may offer to undo this.
 */
export function bakePie(
  projectSlug: string,
  input: BakePieInput,
  options?: RequestOptions,
): Promise<ActionResponse<PieBake>> {
  return sendJson(projectPath(projectSlug, "/pie-bake"), "POST", input, PieBakeSchema, options);
}
