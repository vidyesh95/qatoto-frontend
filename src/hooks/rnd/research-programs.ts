"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/research-programs.api`.
//
// NOTHING HERE IS OPTIMISTIC, and on this surface that is a narrower claim than it is on §9's.
// A slice award is an equity split, so an optimistic verdict there is an optimistic equity
// split. A like is not equity — but `PUT …/reaction` already returns the SERVER'S count, and
// rendering that is both simpler and more correct than incrementing a local number that
// disagrees the moment somebody else reacts. So the rule holds for a different reason: the
// server's answer is available, so guessing is pointless rather than dangerous.
//
// THE INVALIDATION MAP, stated once because it is easy to get subtly wrong:
//
//   a branch write        → branches (the tree is one read) AND the program (branchCount)
//   a claim toggle        → branches only. `contributorCount` is a COUNT over claims, so the
//                           tree read is the only thing that moved. NOT stats: those are a
//                           nightly snapshot and a claim does not change what was true at `asOf`.
//   a paper write         → papers AND branches. `approvedPaperCount` sits on the branch row,
//                           and an approval is what moves a branch from `emerging` toward
//                           `active` on the NEXT job run.
//   a post or reply       → that track's feed, and the thread if a reply
//   a reaction            → the track feed only
//   a participation write → contributors AND the program (`isViewerParticipant`)
//   an effort log         → contributors (`totalEffortMinutes` is a live SUM there)
//   ANY of them           → never `programStats`. Those tiles carry an `asOf` and are recomputed
//                           at 03:20 and 03:35 UTC; invalidating them after a write would refetch
//                           the same snapshot and imply it had moved.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys, type ProgramPaperFilter } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  addPostReaction,
  attachProgramPaperFile,
  claimProgramBranch,
  createPostReply,
  createProgramBranch,
  createProgramOpportunity,
  createProgramPaper,
  createProgramPost,
  createResearchPaperCategory,
  decideResearchPaperCategory,
  createResearchProgram,
  deleteProgramOpportunity,
  deleteProgramPaper,
  dismissContentReport,
  createPaperDownloadLink,
  joinResearchProgram,
  listOwnResearchPrograms,
  listPostReplies,
  listProgramModerationActions,
  listProgramModerationQueue,
  listProgramReviewQueue,
  listResearchPaperCategories,
  logProgramEffort,
  moderateProgramPaper,
  moderateProgramPost,
  moderateResearchProgram,
  recordProgramContribution,
  releaseProgramBranchClaim,
  reportProgramPaper,
  reportProgramPost,
  removePostReaction,
  updateOwnProgramParticipation,
  updateProgramBranch,
  updateResearchProgram,
} from "@/lib/rnd/research-programs.api";
import type {
  ContentReportReason,
  ResearchContributionKind,
  ResearchParticipantRole,
  ResearchPostTrack,
} from "@/lib/rnd/research-programs.schemas";

/** Compensation preferences, narrowed to what a picker offers. */
type CompensationPreference = "salary" | "one_time" | "equity";

// --- Invalidation helpers -----------------------------------------------------------------

function useProgramInvalidation(programSlug: string) {
  const queryClient = useQueryClient();

  return {
    invalidateProgram: (): void => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.researchProgram(programSlug) });
    },
    invalidateBranches: (): void => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.programBranches(programSlug) });
    },
    /**
     * Invalidates every paper list for this program regardless of filter.
     *
     * A partial key match is deliberate: an upload made under one category filter must also
     * refresh the unfiltered list and the moderation-status one, and there is no way to know
     * from here which filters a page currently holds.
     */
    invalidatePapers: (): void => {
      void queryClient.invalidateQueries({
        queryKey: ["rnd", "programs", programSlug, "papers"],
      });
    },
    invalidatePosts: (): void => {
      void queryClient.invalidateQueries({
        queryKey: ["rnd", "programs", programSlug, "posts"],
      });
    },
    invalidateContributors: (): void => {
      void queryClient.invalidateQueries({
        queryKey: ["rnd", "programs", programSlug, "contributors"],
      });
    },
    invalidateOpportunities: (): void => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.programOpportunities(programSlug) });
    },
    invalidateModeration: (): void => {
      void queryClient.invalidateQueries({
        queryKey: ["rnd", "programs", programSlug, "moderation"],
      });
    },
  };
}

// --- Reads --------------------------------------------------------------------------------

/** Your own programs, at any status — the only way to see a `pending` submission. */
export function useOwnResearchProgramsQuery() {
  return useQuery({
    queryKey: rndKeys.ownResearchPrograms(),
    queryFn: async () => unwrap(await listOwnResearchPrograms()),
  });
}

/** The moderator review queue. `enabled` so a non-moderator page never fires a 403. */
export function useProgramReviewQueueQuery(options: { readonly isEnabled: boolean }) {
  return useQuery({
    queryKey: rndKeys.programReviewQueue(),
    queryFn: async () => unwrap(await listProgramReviewQueue({ limit: 50 })),
    enabled: options.isEnabled,
  });
}

/** Approved paper categories — the upload form's picker options. */
export function useResearchPaperCategoriesQuery() {
  return useQuery({
    queryKey: rndKeys.researchPaperCategories("approved"),
    queryFn: async () => unwrap(await listResearchPaperCategories({ status: "approved" })),
    // The taxonomy changes when a moderator approves a proposal, which is rare. A long stale
    // time keeps a form that opens repeatedly from refetching a list of five rows every time.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The moderation queue: open reports plus a count of papers awaiting review.
 *
 * `enabled` on staff standing, for the same reason as the review queue.
 */
export function useProgramModerationQueueQuery(
  programSlug: string,
  options: { readonly isEnabled: boolean },
) {
  return useQuery({
    queryKey: rndKeys.programModerationQueue(programSlug),
    queryFn: async () => unwrap(await listProgramModerationQueue(programSlug, { limit: 50 })),
    enabled: options.isEnabled,
  });
}

/** This program's decision log — the queryable view of the platform audit chain. */
export function useProgramModerationActionsQuery(
  programSlug: string,
  options: { readonly isEnabled: boolean },
) {
  return useQuery({
    queryKey: rndKeys.programModerationActions(programSlug),
    queryFn: async () => unwrap(await listProgramModerationActions(programSlug)),
    enabled: options.isEnabled,
  });
}

/**
 * A thread's full reply list, on demand.
 *
 * The feed already ships up to three inline replies per post, so this fires only when somebody
 * expands a thread — which is why it is `enabled` rather than eager.
 */
export function usePostRepliesQuery(
  programSlug: string,
  postId: string,
  options: { readonly isEnabled: boolean },
) {
  return useQuery({
    queryKey: rndKeys.programPostReplies(programSlug, postId),
    queryFn: async () => unwrap(await listPostReplies(programSlug, postId, { limit: 50 })),
    enabled: options.isEnabled,
  });
}

// --- Program lifecycle --------------------------------------------------------------------

/**
 * Proposes a program.
 *
 * Invalidates `ownResearchPrograms` but NOT the public index — a `pending` program is absent
 * from it by design, and refetching would suggest otherwise.
 */
export function useCreateResearchProgramMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; tagline: string; missionStatement: string }) =>
      unwrap(await createResearchProgram(input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.ownResearchPrograms() });
    },
  });
}

export function useUpdateResearchProgramMutation(programSlug: string) {
  const { invalidateProgram } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (input: {
      title?: string | undefined;
      tagline?: string | undefined;
      missionStatement?: string | undefined;
    }) => unwrap(await updateResearchProgram(programSlug, input)),
    onSuccess: invalidateProgram,
  });
}

/** Publish or reject. Moderator only. Clears the queue AND the public index. */
export function useModerateResearchProgramMutation(programSlug: string) {
  const queryClient = useQueryClient();
  const { invalidateProgram } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (input: { decision: "published" | "rejected"; reviewerNote: string }) =>
      unwrap(await moderateResearchProgram(programSlug, input)),
    onSuccess: () => {
      invalidateProgram();
      void queryClient.invalidateQueries({ queryKey: rndKeys.programReviewQueue() });
      // A publish makes it appear on the public index, so every filter of that index is stale.
      void queryClient.invalidateQueries({ queryKey: ["rnd", "programs", "index"] });
    },
  });
}

// --- Branches -----------------------------------------------------------------------------

/**
 * Create or edit a branch.
 *
 * One hook with an `action` discriminant, matching `useDailyLogMutation`: the composer and the
 * edit form are the same form, and two hooks would mean two invalidation lists to keep in step.
 */
export function useProgramBranchMutation(programSlug: string) {
  const { invalidateBranches, invalidateProgram } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "update";
      branchId?: string;
      title?: string;
      summary?: string;
      parentBranchId?: string | null;
      siblingOrder?: number;
      pinnedLeftPermille?: number | null;
      pinnedTopPermille?: number | null;
    }) => {
      if (variables.action === "create") {
        if (!variables.title || !variables.summary) {
          throw new Error("A branch needs a title and a summary");
        }
        return unwrap(
          await createProgramBranch(programSlug, {
            title: variables.title,
            summary: variables.summary,
            parentBranchId: variables.parentBranchId ?? null,
          }),
        );
      }
      if (!variables.branchId) throw new Error("Missing branch id");
      return unwrap(
        await updateProgramBranch(programSlug, variables.branchId, {
          ...(variables.title === undefined ? {} : { title: variables.title }),
          ...(variables.summary === undefined ? {} : { summary: variables.summary }),
          ...(variables.parentBranchId === undefined
            ? {}
            : { parentBranchId: variables.parentBranchId }),
          ...(variables.siblingOrder === undefined ? {} : { siblingOrder: variables.siblingOrder }),
          ...(variables.pinnedLeftPermille === undefined
            ? {}
            : { pinnedLeftPermille: variables.pinnedLeftPermille }),
          ...(variables.pinnedTopPermille === undefined
            ? {}
            : { pinnedTopPermille: variables.pinnedTopPermille }),
        }),
      );
    },
    onSuccess: () => {
      invalidateBranches();
      // `branchCount` lives on the program summary.
      invalidateProgram();
    },
  });
}

/**
 * Claim or release a branch.
 *
 * Both verbs are IDEMPOTENT server-side, so there is nothing to guard against a double-tap
 * beyond disabling the control while `isPending` — which is UX, not correctness.
 */
export function useProgramBranchClaimMutation(programSlug: string) {
  const { invalidateBranches } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: { branchId: string; action: "claim" | "release" }) =>
      variables.action === "claim"
        ? unwrap(await claimProgramBranch(programSlug, variables.branchId))
        : unwrap(await releaseProgramBranchClaim(programSlug, variables.branchId)),
    // Branches only. `contributorCount` is a COUNT over claims, so the tree read is the only
    // thing that moved — and the stat tiles are a nightly snapshot a claim cannot change.
    onSuccess: invalidateBranches,
  });
}

// --- Papers -------------------------------------------------------------------------------

/**
 * Uploads a paper — BOTH steps, in order.
 *
 * The two-request shape is hidden here rather than in the island, so a caller cannot create a
 * metadata row and forget the file. If the file step fails the row survives, which is the
 * intended behaviour: the paper exists with a DOI and no local copy, and the upload can be
 * retried without re-running the DOI check.
 *
 * `idempotencyKey` is minted ONCE per attempt by the island (`useState(newIdempotencyKey)`),
 * never here — a key generated inside the hook would be new on every retry, which is the
 * opposite of what it is for.
 */
export function useUploadProgramPaperMutation(programSlug: string) {
  const { invalidatePapers, invalidateBranches } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      title: string;
      categoryId: string;
      branchId: string | null;
      doi: string | null;
      authorAffiliation: string | null;
      abstractText: string | null;
      pdfFile: File | null;
      idempotencyKey: string;
    }) => {
      const created = unwrap(
        await createProgramPaper(programSlug, {
          title: variables.title,
          categoryId: variables.categoryId,
          branchId: variables.branchId,
          doi: variables.doi,
          authorAffiliation: variables.authorAffiliation,
          abstractText: variables.abstractText,
        }),
      );

      // No file is a legitimate submission — a DOI with no local copy. Object storage is
      // optional on the backend, so this path has to work.
      if (!variables.pdfFile) return { paperId: created.paperId, fileByteSize: null };

      const attached = unwrap(
        await attachProgramPaperFile(programSlug, created.paperId, {
          pdfFile: variables.pdfFile,
          idempotencyKey: variables.idempotencyKey,
        }),
      );
      return { paperId: created.paperId, fileByteSize: attached.fileByteSize };
    },
    onSuccess: () => {
      invalidatePapers();
      // `approvedPaperCount` sits on the branch row — a queued paper does not move it yet, but
      // the branch read is cheap and the alternative is a stale count after approval.
      invalidateBranches();
    },
  });
}

/** Uploader while `queued`, or staff. */
export function useDeleteProgramPaperMutation(programSlug: string) {
  const { invalidatePapers, invalidateBranches } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (paperId: string) => unwrap(await deleteProgramPaper(programSlug, paperId)),
    onSuccess: () => {
      invalidatePapers();
      invalidateBranches();
    },
  });
}

/**
 * Mints a download link and returns it.
 *
 * A MUTATION rather than a query, deliberately: it has a side effect (a signed, expiring
 * capability is created) and must fire on a click rather than on render. Caching it would also
 * be wrong — the URL expires in five minutes.
 */
export function useCreatePaperDownloadLinkMutation(programSlug: string) {
  return useMutation({
    mutationFn: async (paperId: string) =>
      unwrap(await createPaperDownloadLink(programSlug, paperId)),
  });
}

/** The reviewer's verdict. Moderator only, and terminal. */
export function useModerateProgramPaperMutation(programSlug: string) {
  const { invalidatePapers, invalidateBranches, invalidateModeration } =
    useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      paperId: string;
      decision: "approved" | "rejected" | "needs_changes";
      reviewerNote: string;
      flagReasons: readonly string[];
    }) =>
      unwrap(
        await moderateProgramPaper(programSlug, variables.paperId, {
          decision: variables.decision,
          reviewerNote: variables.reviewerNote,
          flagReasons: variables.flagReasons,
        }),
      ),
    onSuccess: () => {
      invalidatePapers();
      invalidateBranches();
      invalidateModeration();
    },
  });
}

/** Creates a paper category. It lands `pending` but is selectable and usable immediately. */
export function useCreateResearchPaperCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string }) =>
      unwrap(await createResearchPaperCategory(input)),
    onSuccess: () => {
      // The root, so the moderation queue picks the new row up too — it lands `pending`, so
      // the `approved` list this invalidation once targeted is the one list it is NOT in.
      void queryClient.invalidateQueries({ queryKey: rndKeys.paperCategoriesRoot() });
    },
  });
}

/**
 * The moderation queue for the paper taxonomy.
 *
 * PUBLIC, like every status of this list. Deciding is what needs `moderate_taxonomy`.
 */
export function usePendingPaperCategoriesQuery() {
  return useQuery({
    queryKey: rndKeys.researchPaperCategories("pending"),
    queryFn: async () => unwrap(await listResearchPaperCategories({ status: "pending" })),
  });
}

/**
 * Approve or reject a proposed paper category. `moderate_taxonomy`.
 *
 * Invalidates every status: an approval moves the row between two lists, and the `approved`
 * one is what the paper upload form offers.
 */
export function useDecidePaperCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      categoryId: string;
      input: { decision: "approve"; note?: string } | { decision: "reject"; note: string };
    }) => unwrap(await decideResearchPaperCategory(variables.categoryId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.paperCategoriesRoot() });
      void queryClient.invalidateQueries({ queryKey: ["rnd", "platform-audit"] });
    },
  });
}

// --- Posts, replies, reactions ------------------------------------------------------------

/** Create a top-level post, or a reply to one. */
export function useProgramPostMutation(programSlug: string) {
  const queryClient = useQueryClient();
  const { invalidatePosts, invalidateBranches } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "post" | "reply";
      track?: ResearchPostTrack;
      title?: string | null;
      bodyText: string;
      /** Top-level only; a reply inherits its parent's branch. */
      branchId?: string | null;
      parentPostId?: string;
    }) => {
      if (variables.action === "post") {
        if (!variables.track) throw new Error("Missing post track");
        return unwrap(
          await createProgramPost(programSlug, {
            track: variables.track,
            // An informal paper needs a title and an idea must not have one. The backend
            // refines it either way; passing it through unchanged keeps the composer the one
            // place that decides.
            title: variables.title ?? null,
            bodyText: variables.bodyText,
            branchId: variables.branchId ?? null,
          }),
        );
      }
      if (!variables.parentPostId) throw new Error("Missing parent post id");
      return unwrap(
        await createPostReply(programSlug, variables.parentPostId, {
          bodyText: variables.bodyText,
        }),
      );
    },
    onSuccess: (_data, variables) => {
      invalidatePosts();
      // A branch-filed thread moves that branch's `discussionCount` and recent-title list.
      if (variables.branchId) invalidateBranches();
      if (variables.parentPostId) {
        void queryClient.invalidateQueries({
          queryKey: rndKeys.programPostReplies(programSlug, variables.parentPostId),
        });
      }
    },
  });
}

/**
 * Toggle a reaction.
 *
 * Returns the SERVER'S count. The caller renders that rather than incrementing locally — the
 * two disagree the moment anyone else reacts, and only one of them is true.
 */
export function usePostReactionMutation(programSlug: string) {
  const { invalidatePosts } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: { postId: string; isReacted: boolean }) =>
      variables.isReacted
        ? unwrap(await removePostReaction(programSlug, variables.postId))
        : unwrap(await addPostReaction(programSlug, variables.postId)),
    onSuccess: invalidatePosts,
  });
}

/**
 * Report a post or a paper.
 *
 * A second report on the same target is a `409 ALREADY_REPORTED`, which the control should
 * surface rather than swallow — "you have already reported this" is useful.
 */
export function useReportProgramContentMutation(programSlug: string) {
  const { invalidateModeration } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      targetKind: "post" | "paper";
      targetId: string;
      reason: ContentReportReason;
      detailText: string | null;
    }) => {
      const input = { reason: variables.reason, detailText: variables.detailText };
      return variables.targetKind === "post"
        ? unwrap(await reportProgramPost(programSlug, variables.targetId, input))
        : unwrap(await reportProgramPaper(programSlug, variables.targetId, input));
    },
    onSuccess: invalidateModeration,
  });
}

/** Hide or restore a post. Moderator only, and reversible — both directions are audited. */
export function useModerateProgramPostMutation(programSlug: string) {
  const { invalidatePosts, invalidateModeration } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      postId: string;
      decision: "hidden" | "restored";
      reasonNote: string;
    }) =>
      unwrap(
        await moderateProgramPost(programSlug, variables.postId, {
          decision: variables.decision,
          reasonNote: variables.reasonNote,
        }),
      ),
    onSuccess: () => {
      invalidatePosts();
      invalidateModeration();
    },
  });
}

/** "We looked, this is fine." Its own audited decision. */
export function useDismissContentReportMutation(programSlug: string) {
  const { invalidateModeration } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: { reportId: string; reasonNote: string }) =>
      unwrap(
        await dismissContentReport(programSlug, variables.reportId, {
          reasonNote: variables.reasonNote,
        }),
      ),
    onSuccess: invalidateModeration,
  });
}

// --- Participation, effort, contributions -------------------------------------------------

/**
 * Join a program, or edit your own participation.
 *
 * A second join is a `409 ALREADY_A_PARTICIPANT` rather than a silent no-op — because it
 * usually carries a different role, and ignoring it would look like an accepted edit. The
 * island decides which action to send from `isViewerParticipant`.
 */
export function useProgramParticipationMutation(programSlug: string) {
  const { invalidateContributors, invalidateProgram } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "join" | "update";
      role?: ResearchParticipantRole;
      compensationPreference?: CompensationPreference;
      contributionSummary?: string | null;
      fundingTrancheIndex?: number | null;
      fundingTrancheTotal?: number | null;
    }) => {
      if (variables.action === "join") {
        if (!variables.role || !variables.compensationPreference) {
          throw new Error("Joining needs a role and a compensation preference");
        }
        return unwrap(
          await joinResearchProgram(programSlug, {
            role: variables.role,
            compensationPreference: variables.compensationPreference,
            contributionSummary: variables.contributionSummary ?? null,
            fundingTrancheIndex: variables.fundingTrancheIndex ?? null,
            fundingTrancheTotal: variables.fundingTrancheTotal ?? null,
          }),
        );
      }
      return unwrap(
        await updateOwnProgramParticipation(programSlug, {
          ...(variables.role === undefined ? {} : { role: variables.role }),
          ...(variables.compensationPreference === undefined
            ? {}
            : { compensationPreference: variables.compensationPreference }),
          ...(variables.contributionSummary === undefined
            ? {}
            : { contributionSummary: variables.contributionSummary }),
          ...(variables.fundingTrancheIndex === undefined
            ? {}
            : { fundingTrancheIndex: variables.fundingTrancheIndex }),
          ...(variables.fundingTrancheTotal === undefined
            ? {}
            : { fundingTrancheTotal: variables.fundingTrancheTotal }),
        }),
      );
    },
    onSuccess: () => {
      invalidateContributors();
      // `isViewerParticipant` lives on the program detail.
      invalidateProgram();
    },
  });
}

/**
 * Log self-reported time.
 *
 * A REPLAY comes back `wasReplay: true` with the FIRST row's id. Surface that — "already
 * recorded" is a different message from "recorded", and telling someone they logged a second
 * 90 minutes when they did not is the failure the idempotency key exists to prevent.
 */
export function useLogProgramEffortMutation(programSlug: string) {
  const { invalidateContributors } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      minutes: number;
      branchId: string | null;
      loggedForDate: string;
      note: string;
      idempotencyKey: string;
    }) => unwrap(await logProgramEffort(programSlug, variables)),
    // `totalEffortMinutes` is a live SUM on the roster, so it moves immediately. The stat tile
    // does NOT — that is the nightly snapshot.
    onSuccess: invalidateContributors,
  });
}

/**
 * Record a non-time contribution.
 *
 * A RECORD OF INTENT. `amountInCents` goes out as a decimal string of cents, and no copy around
 * this control may say "paid", "collected" or "escrowed" — nothing moves money.
 */
export function useRecordProgramContributionMutation(programSlug: string) {
  const { invalidateContributors } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      kind: ResearchContributionKind;
      amountInCents: string | null;
      currencyCode: string | null;
      description: string;
      idempotencyKey: string;
    }) => unwrap(await recordProgramContribution(programSlug, variables)),
    onSuccess: invalidateContributors,
  });
}

// --- Product opportunities ----------------------------------------------------------------

/** Creator or staff only — see the api wrapper for why this one is not open to contributors. */
export function useProgramOpportunityMutation(programSlug: string) {
  const { invalidateOpportunities } = useProgramInvalidation(programSlug);
  return useMutation({
    mutationFn: async (variables: {
      action: "create" | "delete";
      opportunityId?: string;
      productName?: string;
      productDescription?: string;
      derivedFromBranchId?: string;
      estimatedMarketSizeInCents?: string;
      readinessMinMonths?: number;
      readinessMaxMonths?: number;
    }) => {
      if (variables.action === "delete") {
        if (!variables.opportunityId) throw new Error("Missing opportunity id");
        return unwrap(await deleteProgramOpportunity(programSlug, variables.opportunityId));
      }
      if (
        !variables.productName ||
        !variables.productDescription ||
        !variables.derivedFromBranchId ||
        variables.estimatedMarketSizeInCents === undefined ||
        variables.readinessMinMonths === undefined ||
        variables.readinessMaxMonths === undefined
      ) {
        throw new Error("Missing product opportunity fields");
      }
      return unwrap(
        await createProgramOpportunity(programSlug, {
          productName: variables.productName,
          productDescription: variables.productDescription,
          derivedFromBranchId: variables.derivedFromBranchId,
          estimatedMarketSizeInCents: variables.estimatedMarketSizeInCents,
          readinessMinMonths: variables.readinessMinMonths,
          readinessMaxMonths: variables.readinessMaxMonths,
        }),
      );
    },
    onSuccess: invalidateOpportunities,
  });
}

/**
 * Re-exported as a TYPE only, so a paper-library island and the key factory cannot drift on the
 * one filter shape they share.
 *
 * The api FUNCTIONS are deliberately not re-exported from here: an island that needs
 * `listProgramPapers` for `useKeysetList` imports it from `@/lib/rnd/research-programs.api`
 * directly, which is what the §9 islands do. Re-exporting them would make this module a second
 * front door to the transport layer.
 */
export type { ProgramPaperFilter };
