// TRANSPORT: server-fetch + client-query — every function takes an optional `RequestOptions`
// so both sides can call it. The READS on this surface are mostly PUBLIC (a published program
// is readable signed out), which makes it different from every other R&D module: a server
// component may call the reads without forwarding a cookie and still get data. It should
// forward one anyway via `@/lib/server-http`'s `callerRequestOptions()`, because the session is
// what fills in `isClaimedByViewer`, `isReactedByViewer` and `isUploadedByViewer` — per-viewer
// facts that come back false for an anonymous caller.
//
// Every WRITE is `requireAuth` + `requireIdentifiedUser` and needs the cookie.

import {
  getCursorSiblingList,
  getJson,
  getPaginated,
  sendForm,
  sendJson,
  buildQueryString,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  BranchClaimResultSchema,
  BranchIdResultSchema,
  BranchReleaseResultSchema,
  ContentReportSchema,
  ContributionResultSchema,
  DeletedResultSchema,
  EffortLogResultSchema,
  ModerationActionSchema,
  OpportunityIdResultSchema,
  PaperDownloadLinkSchema,
  PaperFileResultSchema,
  PaperIdResultSchema,
  ParticipantIdResultSchema,
  PostIdResultSchema,
  ProgramIdResultSchema,
  ReactionResultSchema,
  ReportIdResultSchema,
  ResearchBranchSchema,
  ResearchOpportunitySchema,
  ResearchPaperCategorySchema,
  ResearchPaperSchema,
  ResearchParticipantSchema,
  ResearchPostSchema,
  ResearchProgramDetailSchema,
  ResearchProgramStatsSchema,
  ResearchProgramSummarySchema,
  type ContributionResult,
  type EffortLogResult,
  type ModerationAction,
  type PaperDownloadLink,
  type ResearchBranch,
  type ResearchContributionKind,
  type ResearchOpportunity,
  type ResearchPaper,
  type ResearchPaperCategory,
  type ResearchPaperModerationStatus,
  type ResearchParticipant,
  type ResearchParticipantRole,
  type ResearchPost,
  type ResearchPostTrack,
  type ResearchProgramDetail,
  type ResearchProgramStats,
  type ResearchProgramSummary,
} from "@/lib/rnd/research-programs.schemas";
import { PaginationMetaSchema } from "@/lib/rnd/shared.schemas";
import { z } from "zod";

const PROGRAMS_PATH = "/research-programs";

/** Path builder, so a slug is interpolated in exactly one place per shape. */
function programPath(programSlug: string, suffix = ""): string {
  return `${PROGRAMS_PATH}/${encodeURIComponent(programSlug)}${suffix}`;
}

// --- Programs ----------------------------------------------------------------------------

export interface ListProgramsFilter {
  readonly page?: number | undefined;
  readonly limit?: number | undefined;
  /** Free text over title and tagline. Applied by the backend in SQL, never over a page. */
  readonly q?: string | undefined;
}

/** The public index — published and archived only. Offset-paginated. */
export function listResearchPrograms(
  filter: ListProgramsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchProgramSummary[]; pagination: PaginationMeta }>> {
  const query = buildQueryString({
    page: filter.page,
    limit: filter.limit,
    q: filter.q,
  });
  return getPaginated(
    `${PROGRAMS_PATH}${query}`,
    ResearchProgramSummarySchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * Published slugs, for `generateStaticParams`.
 *
 * Wrap the result in `withSentinelValues` before returning it from `generateStaticParams`:
 * `cacheComponents` throws `EmptyGenerateStaticParamsError` on an empty array, and a database
 * with no published program yet is a perfectly ordinary state.
 */
export function listResearchProgramSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson(`${PROGRAMS_PATH}/slugs`, z.array(z.string()), options);
}

/** Your own programs at ANY status — the only way to see a `pending` submission. */
export function listOwnResearchPrograms(
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProgramSummary[]>> {
  return getJson(`${PROGRAMS_PATH}/mine`, z.array(ResearchProgramSummarySchema), options);
}

/** `pending` programs, oldest first. Moderator only — a non-moderator gets 403. */
export function listProgramReviewQueue(
  filter: { readonly page?: number | undefined; readonly limit?: number | undefined } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchProgramSummary[]; pagination: PaginationMeta }>> {
  const query = buildQueryString({ page: filter.page, limit: filter.limit });
  return getPaginated(
    `${PROGRAMS_PATH}/review-queue${query}`,
    ResearchProgramSummarySchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * Proposes a program. It lands `pending` and is invisible on the index until a moderator
 * publishes it — the response's `status` says so, and the UI must too.
 *
 * `status` is deliberately absent from the input: the backend's schema is `.strict()`, so
 * sending it is a 422 rather than a way past review.
 */
export function createResearchProgram(
  input: {
    readonly title: string;
    readonly tagline: string;
    readonly missionStatement: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ programId: string }>> {
  return sendJson(PROGRAMS_PATH, "POST", input, ProgramIdResultSchema, options);
}

export function getResearchProgram(
  programSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProgramDetail>> {
  return getJson(programPath(programSlug), ResearchProgramDetailSchema, options);
}

/**
 * The four hero tiles.
 *
 * **A 404 here is a REAL STATE, not an error**: it means the nightly job has not run for this
 * program yet. Render "not counted yet" rather than an error panel, and never substitute
 * zeroes — four zeroes claim the program has nobody and nothing.
 */
export function getResearchProgramStats(
  programSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProgramStats>> {
  return getJson(programPath(programSlug, "/stats"), ResearchProgramStatsSchema, options);
}

/** Creator-only edit. No `status`, and no `slug` — a published slug has been linked and cited. */
export function updateResearchProgram(
  programSlug: string,
  input: {
    readonly title?: string | undefined;
    readonly tagline?: string | undefined;
    readonly missionStatement?: string | undefined;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ResearchProgramDetail>> {
  return sendJson(programPath(programSlug), "PATCH", input, ResearchProgramDetailSchema, options);
}

/** Publish or reject. Moderator only; the note is required and is what the submitter reads. */
export function moderateResearchProgram(
  programSlug: string,
  input: { readonly decision: "published" | "rejected"; readonly reviewerNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ programId: string }>> {
  return sendJson(
    programPath(programSlug, "/moderate"),
    "POST",
    input,
    ProgramIdResultSchema,
    options,
  );
}

// --- Branches ----------------------------------------------------------------------------

/**
 * The whole tree in one read, in depth-first order.
 *
 * There is no pagination and no `canvasPosition`: the tree is 12–38 nodes and the client lays
 * it out with `branch-tree-layout.ts`.
 */
export function listProgramBranches(
  programSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchBranch[]>> {
  return getJson(programPath(programSlug, "/branches"), z.array(ResearchBranchSchema), options);
}

/**
 * Creates a branch. Anyone signed in, on a published program.
 *
 * `status` and `overlappingGroupCount` are NOT accepted — they are derived nightly, and the
 * created branch will read `emerging` until the job runs. Say so in the UI rather than
 * implying the author chose it.
 */
export function createProgramBranch(
  programSlug: string,
  input: {
    readonly title: string;
    readonly summary: string;
    readonly parentBranchId: string | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ branchId: string }>> {
  return sendJson(
    programPath(programSlug, "/branches"),
    "POST",
    input,
    BranchIdResultSchema,
    options,
  );
}

/** Edit, reorder, or re-parent. A re-parent rewrites the subtree's paths server-side. */
export function updateProgramBranch(
  programSlug: string,
  branchId: string,
  input: {
    readonly title?: string | undefined;
    readonly summary?: string | undefined;
    readonly parentBranchId?: string | null | undefined;
    readonly siblingOrder?: number | undefined;
    readonly pinnedLeftPermille?: number | null | undefined;
    readonly pinnedTopPermille?: number | null | undefined;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ branchId: string }>> {
  return sendJson(
    programPath(programSlug, `/branches/${encodeURIComponent(branchId)}`),
    "PATCH",
    input,
    BranchIdResultSchema,
    options,
  );
}

/**
 * Claim a branch — "I am working on this". IDEMPOTENT: calling it twice is harmless, which is
 * why there is no idempotency key and why a double-tap needs no guarding in the UI.
 */
export function claimProgramBranch(
  programSlug: string,
  branchId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ claimed: true }>> {
  return sendJson(
    programPath(programSlug, `/branches/${encodeURIComponent(branchId)}/claim`),
    "POST",
    undefined,
    BranchClaimResultSchema,
    options,
  );
}

/** Release a claim. Idempotent in the same way — releasing an absent claim still succeeds. */
export function releaseProgramBranchClaim(
  programSlug: string,
  branchId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ released: true }>> {
  return sendJson(
    programPath(programSlug, `/branches/${encodeURIComponent(branchId)}/claim`),
    "DELETE",
    undefined,
    BranchReleaseResultSchema,
    options,
  );
}

// --- Paper categories --------------------------------------------------------------------

/**
 * The paper taxonomy, one status at a time. Public, unpaginated.
 *
 * Defaults to `approved` server-side, which is what a picker wants. `status: "pending"` is
 * the moderation queue — readable without a session, because a proposed term is public the
 * moment it is proposed; ACTING on it is what needs `moderate_taxonomy`.
 */
export function listResearchPaperCategories(
  filter: { readonly status?: "pending" | "approved" | "rejected" } = {},
  options?: RequestOptions,
): Promise<ActionResponse<ResearchPaperCategory[]>> {
  return getJson(
    `/research-paper-categories${buildQueryString({ ...filter })}`,
    z.array(ResearchPaperCategorySchema),
    options,
  );
}

/**
 * A moderator's verdict on a proposed paper category. Requires `moderate_taxonomy`.
 *
 * The §6 shape MINUS `pinIconKey` — that column belongs to the project taxonomy's problem
 * map, and this table has no equivalent. A rejection still REQUIRES a note; an approval does
 * not, which is why this is a union rather than one object with optional fields.
 *
 * NOTE THE PATH: no `/admin` prefix, unlike the project taxonomy's. The capability is
 * identical; only the mount differs.
 */
export function decideResearchPaperCategory(
  categoryId: string,
  input:
    | { readonly decision: "approve"; readonly note?: string }
    | { readonly decision: "reject"; readonly note: string },
  options?: RequestOptions,
): Promise<ActionResponse<ResearchPaperCategory>> {
  return sendJson(
    `/research-paper-categories/${encodeURIComponent(categoryId)}/decide`,
    "POST",
    input,
    ResearchPaperCategorySchema,
    options,
  );
}

/**
 * Creates a category. It lands `pending` and IS usable on a paper straight away — the backend
 * refuses only a `rejected` category, matching the project taxonomy. A moderator settles it later
 * via `POST /research-paper-categories/:categoryId/decide`.
 */
export function createResearchPaperCategory(
  input: { readonly label: string },
  options?: RequestOptions,
): Promise<ActionResponse<ResearchPaperCategory>> {
  return sendJson(
    "/research-paper-categories",
    "POST",
    input,
    ResearchPaperCategorySchema,
    options,
  );
}

// --- Papers ------------------------------------------------------------------------------

export interface ListPapersFilter {
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly branchId?: string | undefined;
  readonly moderationStatus?: ResearchPaperModerationStatus | undefined;
}

/**
 * The library, keyset-paginated. `nextCursor` is a SIBLING of `data`.
 *
 * Non-`approved` rows come back only for their uploader and for staff — the backend applies
 * that in SQL, so a short page is not a sign of a client-side filter.
 */
export function listProgramPapers(
  programSlug: string,
  filter: ListPapersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchPaper[]; nextCursor: string | null }>> {
  const query = buildQueryString({
    limit: filter.limit,
    cursor: filter.cursor,
    categoryId: filter.categoryId,
    branchId: filter.branchId,
    moderationStatus: filter.moderationStatus,
  });
  return getCursorSiblingList(
    programPath(programSlug, `/papers${query}`),
    ResearchPaperSchema,
    options,
  );
}

/**
 * Step 1 of 2: the metadata row. The PDF follows via {@link attachProgramPaperFile}.
 *
 * Split because a failed or retried upload must not re-mint a row or re-run the DOI check,
 * and because a paper with a DOI and no local copy is a real state — object storage is
 * optional on the backend.
 */
export function createProgramPaper(
  programSlug: string,
  input: {
    readonly title: string;
    readonly categoryId: string;
    readonly branchId: string | null;
    readonly doi: string | null;
    readonly authorAffiliation: string | null;
    readonly abstractText: string | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ paperId: string }>> {
  return sendJson(programPath(programSlug, "/papers"), "POST", input, PaperIdResultSchema, options);
}

/**
 * Step 2 of 2: the bytes.
 *
 * Multipart, field name `paper`. EVERY fact about the file is measured server-side — size,
 * sha256, storage key — so there is nothing to send but the file and the idempotency key.
 * Mint that key ONCE per attempt with `newIdempotencyKey()` held in component state.
 */
export function attachProgramPaperFile(
  programSlug: string,
  paperId: string,
  input: { readonly pdfFile: File; readonly idempotencyKey: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ fileByteSize: number }>> {
  const formData = new FormData();
  formData.append("paper", input.pdfFile);
  formData.append("idempotencyKey", input.idempotencyKey);
  return sendForm(
    programPath(programSlug, `/papers/${encodeURIComponent(paperId)}/file`),
    "POST",
    formData,
    PaperFileResultSchema,
    options,
  );
}

/**
 * A short-lived (5-minute) presigned download URL.
 *
 * Returned as DATA rather than a redirect, so the client holds a value it can reason about.
 * Requires a session even though the library is public — a download link is a bearer
 * capability.
 */
export function createPaperDownloadLink(
  programSlug: string,
  paperId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PaperDownloadLink>> {
  return getJson(
    programPath(programSlug, `/papers/${encodeURIComponent(paperId)}/download`),
    PaperDownloadLinkSchema,
    options,
  );
}

/** Uploader while still `queued`, or staff. Removes the stored bytes too. */
export function deleteProgramPaper(
  programSlug: string,
  paperId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: true }>> {
  return sendJson(
    programPath(programSlug, `/papers/${encodeURIComponent(paperId)}`),
    "DELETE",
    undefined,
    DeletedResultSchema,
    options,
  );
}

/** The reviewer's verdict. Moderator only, and terminal — a paper is reviewed once. */
export function moderateProgramPaper(
  programSlug: string,
  paperId: string,
  input: {
    readonly decision: "approved" | "rejected" | "needs_changes";
    readonly reviewerNote: string;
    readonly flagReasons: readonly string[];
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ paperId: string }>> {
  return sendJson(
    programPath(programSlug, `/papers/${encodeURIComponent(paperId)}/moderate`),
    "POST",
    input,
    PaperIdResultSchema,
    options,
  );
}

// --- Posts, replies, reactions ------------------------------------------------------------

export interface ListPostsFilter {
  readonly track: ResearchPostTrack;
  readonly limit?: number | undefined;
  readonly cursor?: string | undefined;
}

/** A track's feed. Top-level rows, each carrying up to three inline replies. */
export function listProgramPosts(
  programSlug: string,
  filter: ListPostsFilter,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchPost[]; nextCursor: string | null }>> {
  const query = buildQueryString({
    track: filter.track,
    limit: filter.limit,
    cursor: filter.cursor,
  });
  return getCursorSiblingList(
    programPath(programSlug, `/posts${query}`),
    ResearchPostSchema,
    options,
  );
}

/** The full thread, oldest first — the "show all N replies" read. */
export function listPostReplies(
  programSlug: string,
  postId: string,
  filter: { readonly limit?: number | undefined; readonly cursor?: string | undefined } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchPost[]; nextCursor: string | null }>> {
  const query = buildQueryString({ limit: filter.limit, cursor: filter.cursor });
  return getCursorSiblingList(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/replies${query}`),
    ResearchPostSchema,
    options,
  );
}

/**
 * An informal paper (titled) or an idea (untitled).
 *
 * `title` must be non-null for `informal_paper` and null for `idea` — the backend refines it
 * and answers 422, so the composer should enforce the same rule rather than discovering it.
 */
export function createProgramPost(
  programSlug: string,
  input: {
    readonly track: ResearchPostTrack;
    readonly title: string | null;
    readonly bodyText: string;
    /**
     * Which branch the thread is about, or null for a program-wide one.
     *
     * Accepted on a top-level post only — a REPLY inherits its parent's branch, so
     * {@link createPostReply} takes no such field. A thread must not span two branches.
     */
    readonly branchId: string | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ postId: string }>> {
  return sendJson(programPath(programSlug, "/posts"), "POST", input, PostIdResultSchema, options);
}

/** One level deep. Replying to a reply is a 409, so the UI offers it only on top-level rows. */
export function createPostReply(
  programSlug: string,
  postId: string,
  input: { readonly bodyText: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ postId: string }>> {
  return sendJson(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/replies`),
    "POST",
    input,
    PostIdResultSchema,
    options,
  );
}

/**
 * Add a reaction. `PUT`, and **idempotent by verb** — a double-tap on a slow connection is
 * harmless rather than a second like.
 *
 * Returns the server's count. Render THAT, not an incremented guess: the two disagree the
 * moment somebody else reacts, and the server's number is the one that is true.
 */
export function addPostReaction(
  programSlug: string,
  postId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ reactionCount: number }>> {
  return sendJson(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/reaction`),
    "PUT",
    undefined,
    ReactionResultSchema,
    options,
  );
}

/** Remove a reaction. Idempotent in the same way; the count never goes negative. */
export function removePostReaction(
  programSlug: string,
  postId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ reactionCount: number }>> {
  return sendJson(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/reaction`),
    "DELETE",
    undefined,
    ReactionResultSchema,
    options,
  );
}

/** Report a post. One per user per target — a second is a 409, which is worth surfacing. */
export function reportProgramPost(
  programSlug: string,
  postId: string,
  input: { readonly reason: string; readonly detailText: string | null },
  options?: RequestOptions,
): Promise<ActionResponse<{ reportId: string }>> {
  return sendJson(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/report`),
    "POST",
    input,
    ReportIdResultSchema,
    options,
  );
}

/** Report a paper — the same primitive, the other target. */
export function reportProgramPaper(
  programSlug: string,
  paperId: string,
  input: { readonly reason: string; readonly detailText: string | null },
  options?: RequestOptions,
): Promise<ActionResponse<{ reportId: string }>> {
  return sendJson(
    programPath(programSlug, `/papers/${encodeURIComponent(paperId)}/report`),
    "POST",
    input,
    ReportIdResultSchema,
    options,
  );
}

/** Hide or restore. Moderator only, and REVERSIBLE — both directions are audited. */
export function moderateProgramPost(
  programSlug: string,
  postId: string,
  input: { readonly decision: "hidden" | "restored"; readonly reasonNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ postId: string }>> {
  return sendJson(
    programPath(programSlug, `/posts/${encodeURIComponent(postId)}/moderate`),
    "POST",
    input,
    PostIdResultSchema,
    options,
  );
}

// --- Moderation queue ---------------------------------------------------------------------

/**
 * Open reports, oldest first, plus a count of papers awaiting review.
 *
 * THE CURSOR AND THE COUNT ARE INSIDE `data` on this one route, unlike every other keyset read
 * in this module. Those return one list and put `nextCursor` beside it; this returns a list
 * PLUS a scalar the queue badges, and a `data`-shaped client cannot see a third sibling. So the
 * backend nests all three — which is why this uses `getJson` with an object schema rather than
 * `getCursorSiblingList`.
 */
export const ModerationQueuePageSchema = z
  .object({
    reports: z.array(ContentReportSchema),
    nextCursor: z.string().nullable(),
    queuedPaperCount: z.number(),
  })
  .strip();
export type ModerationQueuePage = z.infer<typeof ModerationQueuePageSchema>;

export function listProgramModerationQueue(
  programSlug: string,
  filter: { readonly limit?: number | undefined; readonly cursor?: string | undefined } = {},
  options?: RequestOptions,
): Promise<ActionResponse<ModerationQueuePage>> {
  const query = buildQueryString({ limit: filter.limit, cursor: filter.cursor });
  return getJson(
    programPath(programSlug, `/moderation/queue${query}`),
    ModerationQueuePageSchema,
    options,
  );
}

/** This program's decision log — the queryable view of the platform audit chain. */
export function listProgramModerationActions(
  programSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ModerationAction[]>> {
  return getJson(
    programPath(programSlug, "/moderation/actions"),
    z.array(ModerationActionSchema),
    options,
  );
}

/** "We looked, this is fine." Recorded as its own audited decision. */
export function dismissContentReport(
  programSlug: string,
  reportId: string,
  input: { readonly reasonNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ reportId: string }>> {
  return sendJson(
    programPath(programSlug, `/reports/${encodeURIComponent(reportId)}/dismiss`),
    "POST",
    input,
    ReportIdResultSchema,
    options,
  );
}

// --- Contributors, effort, contributions --------------------------------------------------

/** The roster. `role` filters IN SQL — never fetch the roster to filter it client-side. */
export function listProgramContributors(
  programSlug: string,
  filter: {
    readonly role?: ResearchParticipantRole | undefined;
    readonly page?: number | undefined;
    readonly limit?: number | undefined;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ResearchParticipant[]; pagination: PaginationMeta }>> {
  const query = buildQueryString({
    role: filter.role,
    page: filter.page,
    limit: filter.limit,
  });
  return getPaginated(
    programPath(programSlug, `/contributors${query}`),
    ResearchParticipantSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * Join a program.
 *
 * A second call is a 409 rather than a silent no-op, because it usually carries a DIFFERENT
 * role — use {@link updateOwnProgramParticipation} to change details.
 */
export function joinResearchProgram(
  programSlug: string,
  input: {
    readonly role: ResearchParticipantRole;
    readonly compensationPreference: "salary" | "one_time" | "equity";
    readonly contributionSummary: string | null;
    readonly fundingTrancheIndex: number | null;
    readonly fundingTrancheTotal: number | null;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ participantId: string }>> {
  return sendJson(
    programPath(programSlug, "/contributors/me"),
    "POST",
    input,
    ParticipantIdResultSchema,
    options,
  );
}

/** Edit your OWN participation. There is no route for editing anybody else's. */
export function updateOwnProgramParticipation(
  programSlug: string,
  input: {
    readonly role?: ResearchParticipantRole | undefined;
    readonly compensationPreference?: "salary" | "one_time" | "equity" | undefined;
    readonly contributionSummary?: string | null | undefined;
    readonly fundingTrancheIndex?: number | null | undefined;
    readonly fundingTrancheTotal?: number | null | undefined;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ participantId: string }>> {
  return sendJson(
    programPath(programSlug, "/contributors/me"),
    "PATCH",
    input,
    ParticipantIdResultSchema,
    options,
  );
}

/**
 * Log self-reported time.
 *
 * NOT an effort claim: nothing verifies it, nothing grounds it against an artifact, and it
 * mints no equity. Say so where it is offered.
 *
 * `idempotencyKey` is minted ONCE per attempt in component state. A replay returns
 * `wasReplay: true` and the FIRST row's id — surface that as "already recorded" rather than
 * implying a second log.
 */
export function logProgramEffort(
  programSlug: string,
  input: {
    readonly minutes: number;
    readonly branchId: string | null;
    /** `YYYY-MM-DD`. A future date is a 422. */
    readonly loggedForDate: string;
    readonly note: string;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<EffortLogResult>> {
  return sendJson(
    programPath(programSlug, "/effort-logs"),
    "POST",
    input,
    EffortLogResultSchema,
    options,
  );
}

/**
 * Record a non-time contribution.
 *
 * A RECORD OF INTENT. `cash_commitment` carries an amount as a DECIMAL STRING of cents; no
 * money moves, nothing is held, and no copy around this control may imply otherwise. The
 * amount and currency must be present for `cash_commitment` and absent for every other kind.
 */
export function recordProgramContribution(
  programSlug: string,
  input: {
    readonly kind: ResearchContributionKind;
    readonly amountInCents: string | null;
    readonly currencyCode: string | null;
    readonly description: string;
    readonly idempotencyKey: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<ContributionResult>> {
  return sendJson(
    programPath(programSlug, "/contributions"),
    "POST",
    input,
    ContributionResultSchema,
    options,
  );
}

// --- Product opportunities ----------------------------------------------------------------

/** Public. Largest market projection first. */
export function listProgramOpportunities(
  programSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ResearchOpportunity[]>> {
  return getJson(
    programPath(programSlug, "/product-opportunities"),
    z.array(ResearchOpportunitySchema),
    options,
  );
}

/**
 * CREATOR OR STAFF only, unlike everything else on this surface.
 *
 * A market projection attributed to a program is a claim the program makes about itself; every
 * contributor being able to publish one would turn the rail into an advertising surface.
 *
 * `estimatedMarketSizeInCents` goes out as a DECIMAL STRING because the column is a bigint.
 */
export function createProgramOpportunity(
  programSlug: string,
  input: {
    readonly productName: string;
    readonly productDescription: string;
    readonly derivedFromBranchId: string;
    readonly estimatedMarketSizeInCents: string;
    readonly readinessMinMonths: number;
    readonly readinessMaxMonths: number;
  },
  options?: RequestOptions,
): Promise<ActionResponse<{ opportunityId: string }>> {
  return sendJson(
    programPath(programSlug, "/product-opportunities"),
    "POST",
    input,
    OpportunityIdResultSchema,
    options,
  );
}

/** Creator or staff. */
export function deleteProgramOpportunity(
  programSlug: string,
  opportunityId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: true }>> {
  return sendJson(
    programPath(programSlug, `/product-opportunities/${encodeURIComponent(opportunityId)}`),
    "DELETE",
    undefined,
    DeletedResultSchema,
    options,
  );
}
