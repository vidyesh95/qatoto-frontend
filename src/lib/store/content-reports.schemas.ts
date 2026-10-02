// Client contract for `commerce_content_report` and `commerce_moderation_action` — the five routes
// on `src/modules/store/trust/commerce-content-reports.routes.ts`, mounted at `/commerce`.
//
// ONE FILE FOR BOTH HALVES, unlike the api files beside it. The reporter posts a report and the
// moderator reads a page of them, and both are the same row: two copies of `CommerceContentReport`
// would be two things to update when the backend adds a field, and the one that got missed would
// fail a parse on whichever surface nobody was looking at. The API SPLIT is about what gets
// imported into a public bundle; the TYPE is one type.
//
// ⚠️ NOT THE COMMUNITY REPORT FAMILY, WHOSE NAMES ARE NEARLY IDENTICAL. `POST /community/reports`
// and `GET /community/admin/content-reports` are a DIFFERENT backend module, already wired in
// `forum.api.ts` and `admin-community.api.ts`, gated by `moderate_content` rather than
// `moderate_commerce`, over a two-value target enum (`forum_thread`, `forum_reply`) and a different
// reason list. Nothing here may be folded into that, and a forum thread is not reportable here.
//
// ⚠️ THE ENUM VALUES ARE POSTGRES `pgEnum` LABELS AND ARE SENT VERBATIM IN BOTH DIRECTIONS. They
// are snake_case on purpose — `prohibited_item`, not `prohibited-item`. Kebab-casing one is not a
// style choice, it is a 422 from a `.strict()` body and a `z.enum` that fails the whole parse.
// `src/db/schema/store.ts` is the authority, never a doc.

import { z } from "zod";
import {
  ORGANIZATION_MEMBER_ROLES,
  type OrganizationMemberRole,
} from "@/lib/store/organizations.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * What can be reported.
 *
 * ⚠️ **THREE OF THESE FIVE AUTO-HIDE AND TWO NEVER DO, AND NO COPY MAY BLUR THAT.**
 * `commerce-content-reports.service.ts` hides a `review`, `question` or `answer` once three
 * DISTINCT reporters have open reports against it, inside the same transaction as the insert. A
 * `product` and an `organization` never auto-hide, on the service's own stated ground that
 * "delisting a seller's listing is a commercial action against their livelihood" and needs a
 * person. `AUTO_HIDING_TARGET_KINDS` below is what the sheet branches its confirmation on.
 */
export const COMMERCE_CONTENT_TARGET_KINDS = [
  "product",
  "review",
  "question",
  "answer",
  "organization",
] as const;

export type CommerceContentTargetKind = (typeof COMMERCE_CONTENT_TARGET_KINDS)[number];

/**
 * The three kinds a threshold of reporters can hide without a moderator.
 *
 * Mirrors `AUTO_HIDEABLE_TARGET_KINDS` in the service. The THRESHOLD ITSELF IS DELIBERATELY NOT
 * MIRRORED — publishing "three people can hide this" is a griefing recipe, and the number is the
 * server's to change without a frontend release. The sheet says "several different people".
 */
export const AUTO_HIDING_TARGET_KINDS: readonly CommerceContentTargetKind[] = [
  "review",
  "question",
  "answer",
];

export function doesTargetKindAutoHide(targetKind: CommerceContentTargetKind): boolean {
  return AUTO_HIDING_TARGET_KINDS.includes(targetKind);
}

export const COMMERCE_REPORT_REASONS = [
  "spam",
  "counterfeit",
  "prohibited_item",
  "misleading_claim",
  "intellectual_property",
  "harassment",
  "off_topic",
  "other",
] as const;

export type CommerceReportReason = (typeof COMMERCE_REPORT_REASONS)[number];

export const COMMERCE_REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;

export type CommerceReportStatus = (typeof COMMERCE_REPORT_STATUSES)[number];

/**
 * What a moderation action RECORDS. Note `content_restored` and the automatic hide: this enum is
 * the only place either becomes visible to a human anywhere in the product.
 */
export const COMMERCE_MODERATION_ACTION_KINDS = [
  "content_hidden",
  "content_restored",
  "report_dismissed",
  "product_moderation_state_changed",
] as const;

export type CommerceModerationActionKind = (typeof COMMERCE_MODERATION_ACTION_KINDS)[number];

/**
 * Who acted.
 *
 * ⚠️ `automatic` IS NOT DECORATION. It marks a hide that the reporter threshold performed with no
 * moderator behind it — nobody was told, no audit entry names a person, and the moderation log is
 * the only surface where it can be seen or undone.
 */
export const COMMERCE_MODERATION_ACTION_SOURCES = ["moderator", "automatic"] as const;

export type CommerceModerationActionSource = (typeof COMMERCE_MODERATION_ACTION_SOURCES)[number];

/**
 * One report, exactly as `projectReport` emits it.
 *
 * ⚠️ **WHAT IS ABSENT HERE SHAPES THE WHOLE CONSOLE, so read the omissions before adding a field.**
 * There is no reporter (the queue hides reporter identity from moderators — one who can see it can
 * be lobbied), no target title, no open-report count, NO VISIBILITY FLAG, and no `resolutionNote`
 * — the note is written to the row and never projected back. So a card cannot show what is being
 * decided beyond the kind, the id, the reason and the reporter's own words, and "is this hidden?"
 * is NOT answerable from this payload. `status === "actioned"` is the closest honest proxy and is
 * what the restore control keys on.
 *
 * ⚠️ `targetId` CAN BE THE EMPTY STRING. `projectReport` ends with `readTargetId(report) ?? ""`,
 * so a target whose row has gone leaves a report with no id rather than a null one. It is modelled
 * as a plain string here and narrowed by `resolveModerationTarget` below, because a `.min(1)` here
 * would fail the parse of the whole page over one unresolvable row.
 */
export const CommerceContentReportSchema = z.object({
  id: z.string(),
  targetKind: z.enum(COMMERCE_CONTENT_TARGET_KINDS),
  targetId: z.string(),
  reason: z.enum(COMMERCE_REPORT_REASONS),
  detailText: z.string().nullable(),
  status: z.enum(COMMERCE_REPORT_STATUSES),
  createdAt: IsoDateTimeSchema,
  resolvedAt: IsoDateTimeSchema.nullable(),
});

export type CommerceContentReport = z.infer<typeof CommerceContentReportSchema>;

/**
 * One recorded action. A DIFFERENT SHAPE FROM A REPORT, which matters because the restore write
 * answers this while the decision write answers a report — parsing one as the other is a refused
 * write that actually succeeded on the server.
 *
 * `targetId` is genuinely `null`-able here, unlike the report's `""`.
 */
export const CommerceModerationActionSchema = z.object({
  id: z.string(),
  actionKind: z.enum(COMMERCE_MODERATION_ACTION_KINDS),
  targetKind: z.enum(COMMERCE_CONTENT_TARGET_KINDS),
  targetId: z.string().nullable(),
  actionSource: z.enum(COMMERCE_MODERATION_ACTION_SOURCES),
  reasonNote: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export type CommerceModerationAction = z.infer<typeof CommerceModerationActionSchema>;

export const CommerceContentReportPageSchema = cursorPageOf(CommerceContentReportSchema);
export const CommerceModerationActionPageSchema = cursorPageOf(CommerceModerationActionSchema);

export type CommerceContentReportPage = z.infer<typeof CommerceContentReportPageSchema>;
export type CommerceModerationActionPage = z.infer<typeof CommerceModerationActionPageSchema>;

/**
 * A target the console can act on, or one it cannot.
 *
 * Pattern 1 over a `string | null` plus an empty-string special case, which is two ways to spell
 * the same absence and would let a restore be sent with `targetId: ""` — a 404 that reads like the
 * route is broken. The `unresolvable` arm renders the row with no restore control and says why.
 */
export type ModerationTarget =
  | {
      readonly kind: "resolved";
      readonly targetKind: CommerceContentTargetKind;
      readonly targetId: string;
    }
  | { readonly kind: "unresolvable"; readonly targetKind: CommerceContentTargetKind };

export function resolveModerationTarget(
  targetKind: CommerceContentTargetKind,
  targetId: string | null,
): ModerationTarget {
  if (targetId === null || targetId.length === 0) return { kind: "unresolvable", targetKind };
  return { kind: "resolved", targetKind, targetId };
}

/** `POST /commerce/reports`. `detailText` is OMITTED when empty — see the api file. */
export interface CreateCommerceReportInput {
  readonly targetKind: CommerceContentTargetKind;
  readonly targetId: string;
  readonly reason: CommerceReportReason;
  readonly detailText?: string;
}

/**
 * `POST /commerce/admin/content-reports/:reportId/decisions`.
 *
 * The note is OPTIONAL here and REQUIRED on a restore, and that asymmetry is the backend's. A
 * decision is the expected outcome of a queue; an un-hide reverses a call somebody already made.
 */
export interface DecideCommerceReportInput {
  readonly decision: "actioned" | "dismissed";
  readonly note?: string;
}

/**
 * `POST /commerce/admin/content/restore`.
 *
 * ⚠️ KEYED ON THE TARGET, NOT ON A REPORT ID. Restoring is an act against a piece of content, not
 * against the report that named it — which is why it is also reachable from a `content_hidden`
 * action row that no report is attached to (the automatic case).
 */
export interface RestoreCommerceContentInput {
  readonly targetKind: CommerceContentTargetKind;
  readonly targetId: string;
  readonly reasonNote: string;
}

/**
 * Shared by BOTH admin reads, because the backend shares one schema between them.
 *
 * ⚠️ **`status` IS ACCEPTED BY THE MODERATION-ACTION ROUTE AND SILENTLY IGNORED.**
 * `listModerationActions` reads only `targetKind` and `cursor`. A status control on the log tab
 * would change the query key, refetch, and return byte-identical rows — a filter that appears to
 * work and does nothing. The log tab offers `targetKind` alone, and this interface is the reason
 * that is a deliberate omission rather than an oversight.
 *
 * `limit` is deliberately absent: the server defaults to 20 and caps at 50, and a client-chosen
 * page size is a second number to keep in sync for no gain.
 */
export interface ListCommerceReportsFilter {
  readonly status?: CommerceReportStatus;
  readonly targetKind?: CommerceContentTargetKind;
  readonly cursor?: string;
}

export interface ListCommerceModerationActionsFilter {
  readonly targetKind?: CommerceContentTargetKind;
  readonly cursor?: string;
}

// --- Withdrawn answers ------------------------------------------------------
//
// `GET /commerce/admin/withdrawn-answers`. A WITHDRAWAL IS NOT A MODERATION EVENT, so it writes no
// moderation action and the log tab cannot show one. The backend reads the
// `product_answer_withdrawn` events off the answering organizations' audit chains instead. One row
// per EVENT: an answer withdrawn, restored and withdrawn again is two rows sharing one current state.

/** `commerce_ugc_visibility_state`, verbatim. */
export const COMMERCE_UGC_VISIBILITY_STATES = [
  "visible",
  "hidden_pending_review",
  "hidden_by_moderator",
  "removed_by_author",
] as const;

export type CommerceUgcVisibilityState = (typeof COMMERCE_UGC_VISIBILITY_STATES)[number];

export const PRODUCT_ANSWER_AUTHOR_KINDS = ["seller", "verified_buyer"] as const;

export type ProductAnswerAuthorKind = (typeof PRODUCT_ANSWER_AUTHOR_KINDS)[number];

/** Who pressed withdraw: the person who wrote it, or a teammate at the answering organization. */
export const ANSWER_WITHDRAWER_KINDS = ["author", "organization_member"] as const;

export type AnswerWithdrawerKind = (typeof ANSWER_WITHDRAWER_KINDS)[number];

/**
 * The read's `state` filter. `still_withdrawn` (the default) is what can be restored; `all` keeps
 * the answers since restored or hidden, for the history.
 */
export const WITHDRAWN_ANSWER_STATE_FILTERS = ["still_withdrawn", "all"] as const;

export type WithdrawnAnswerStateFilter = (typeof WITHDRAWN_ANSWER_STATE_FILTERS)[number];

/**
 * One withdrawal.
 *
 * ⚠️ **`answerBodyText` IS THE WITHDRAWN TEXT** — text its author took off the product page. It is
 * here because whether to restore is a judgment about what the answer said, and the route is
 * `moderate_commerce`-gated in the service. It must never reach a public surface.
 *
 * `withdrawnBy` is `null` when the backend could not read the audit payload; the row is still a
 * withdrawal and still restorable. `actorMemberRoleSnapshot` is `null` when the actor was not a
 * member of the answering organization at the time.
 */
export const WithdrawnProductAnswerSchema = z.object({
  auditEntryId: z.string(),
  withdrawnAt: IsoDateTimeSchema,
  withdrawnBy: z.enum(ANSWER_WITHDRAWER_KINDS).nullable(),
  actorUserId: z.string().nullable(),
  actorMemberRoleSnapshot: z.enum(ORGANIZATION_MEMBER_ROLES).nullable(),
  answerId: z.string(),
  answerBodyText: z.string(),
  authorKind: z.enum(PRODUCT_ANSWER_AUTHOR_KINDS),
  answeringOrganizationId: z.string(),
  currentVisibilityState: z.enum(COMMERCE_UGC_VISIBILITY_STATES),
  questionId: z.string(),
  questionBodyText: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  productPublicSlug: z.string().nullable(),
});

export type WithdrawnProductAnswer = z.infer<typeof WithdrawnProductAnswerSchema>;

export const WithdrawnProductAnswerPageSchema = cursorPageOf(WithdrawnProductAnswerSchema);

export type WithdrawnProductAnswerPage = z.infer<typeof WithdrawnProductAnswerPageSchema>;

export interface ListWithdrawnAnswersFilter {
  readonly state: WithdrawnAnswerStateFilter;
  readonly cursor?: string;
}

// --- Display maps -----------------------------------------------------------
//
// These live here rather than in `labels.ts`, which that file reserves for enums crossing more
// than one domain. Content reporting is one domain and these have one consumer each.

/** Worded for goods. A reporter picking a reason is describing a listing, not a video. */
export const COMMERCE_REPORT_REASON_LABELS: Record<CommerceReportReason, string> = {
  spam: "Spam or repeated posting",
  counterfeit: "Counterfeit or fake goods",
  prohibited_item: "Something that may not be sold here",
  misleading_claim: "A claim that is false or can't be true",
  intellectual_property: "Uses someone else's brand, design or photos",
  harassment: "Abusive or harassing",
  off_topic: "Not about this product",
  other: "Something else",
};

/** What the reporter is looking at, for the sheet's own heading. */
export const COMMERCE_CONTENT_TARGET_KIND_LABELS: Record<CommerceContentTargetKind, string> = {
  product: "this listing",
  review: "this review",
  question: "this question",
  answer: "this answer",
  organization: "this company",
};

/** For a moderator's row, where the kind is a column rather than a sentence. */
export const COMMERCE_CONTENT_TARGET_KIND_NOUNS: Record<CommerceContentTargetKind, string> = {
  product: "Listing",
  review: "Review",
  question: "Question",
  answer: "Answer",
  organization: "Company",
};

export const COMMERCE_REPORT_STATUS_LABELS: Record<CommerceReportStatus, string> = {
  open: "Open",
  actioned: "Upheld",
  dismissed: "Dismissed",
};

/**
 * ⚠️ "Upheld", NOT "Hidden", and the distinction is load-bearing on ONE of the five kinds.
 * `actioned` hides a product, review, question or answer — but its `organization` arm is a
 * documented no-op in `setTargetVisibility`, so a company report can be upheld with the company
 * page entirely untouched. A label reading "Hidden" would be a false statement about that row.
 */
export const COMMERCE_MODERATION_ACTION_KIND_LABELS: Record<CommerceModerationActionKind, string> =
  {
    content_hidden: "Hidden",
    content_restored: "Restored",
    report_dismissed: "Report dismissed",
    product_moderation_state_changed: "Listing state changed",
  };

export const COMMERCE_MODERATION_ACTION_SOURCE_LABELS: Record<
  CommerceModerationActionSource,
  string
> = {
  moderator: "By a moderator",
  automatic: "Automatic, after several reports",
};

export const WITHDRAWN_ANSWER_STATE_FILTER_LABELS: Record<WithdrawnAnswerStateFilter, string> = {
  still_withdrawn: "Still withdrawn",
  all: "All withdrawals",
};

/** The answer's state NOW, worded for the moderator deciding whether to restore it. */
export const COMMERCE_UGC_VISIBILITY_STATE_LABELS: Record<CommerceUgcVisibilityState, string> = {
  visible: "Back up",
  hidden_pending_review: "Hidden by several reports",
  hidden_by_moderator: "Hidden by a moderator",
  removed_by_author: "Still withdrawn",
};

export const PRODUCT_ANSWER_AUTHOR_KIND_LABELS: Record<ProductAnswerAuthorKind, string> = {
  seller: "Seller answer",
  verified_buyer: "Verified buyer answer",
};

export const ANSWER_WITHDRAWER_KIND_LABELS: Record<AnswerWithdrawerKind, string> = {
  author: "Withdrawn by its author",
  organization_member: "Withdrawn by a teammate at the answering company",
};

export const ORGANIZATION_MEMBER_ROLE_LABELS: Record<OrganizationMemberRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  buyer: "Buyer",
  seller: "Seller",
  provider_operator: "Provider operator",
  finance: "Finance",
  support: "Support",
  viewer: "Viewer",
};
