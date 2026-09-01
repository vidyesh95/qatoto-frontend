// TRANSPORT: props-only — the pure contract for the `/support` routes. No network, no React.
//
// ⚠️ COPY RULE THAT TRAVELS WITH THESE TYPES. A support case is a conversation. Qatoto holds
// no funds, so nothing rendered from this data may say "refund", "we will recover it", or
// anything else that promises money will move. It can say what happened and where the record
// of it lives.

import { z } from "zod";

/**
 * Byte-identical to the backend's `support_case_category` pgEnum.
 *
 * SNAKE_CASE, and not to be "corrected" to kebab. These are Postgres enum labels sent
 * verbatim; `payment-problem` is a 422 from a `.strict()` schema, not an ignored value.
 */
export const SUPPORT_CASE_CATEGORIES = [
  "payment_problem",
  "order_problem",
  "account_problem",
  "content_problem",
  "technical_problem",
  "other",
] as const;

export const SupportCaseCategorySchema = z.enum(SUPPORT_CASE_CATEGORIES);
export type SupportCaseCategory = z.infer<typeof SupportCaseCategorySchema>;

export const SUPPORT_CASE_STATES = ["open", "awaiting_user", "resolved", "closed"] as const;
export const SupportCaseStateSchema = z.enum(SUPPORT_CASE_STATES);
export type SupportCaseState = z.infer<typeof SupportCaseStateSchema>;

export const SupportCaseAuthorKindSchema = z.enum(["case_opener", "staff"]);
export type SupportCaseAuthorKind = z.infer<typeof SupportCaseAuthorKindSchema>;

/**
 * One message in a thread.
 *
 * NO AUTHOR ID AND NO AUTHOR NAME, because the backend's projection carries neither. The
 * person learns that support answered, never which staff member did — the same reasoning that
 * keeps a moderator's name out of `/report-history`. Nothing here may invent a name for the
 * `staff` side beyond the generic label below.
 */
export const SupportCaseMessageSchema = z
  .object({
    id: z.string(),
    sequence: z.number().int(),
    authorKind: SupportCaseAuthorKindSchema,
    body: z.string(),
    createdAt: z.iso.datetime(),
  })
  .strip();
export type SupportCaseMessage = z.infer<typeof SupportCaseMessageSchema>;

/** A row in "your cases" and in the staff queue alike. */
export const SupportCaseSummarySchema = z
  .object({
    id: z.string(),
    category: SupportCaseCategorySchema,
    state: SupportCaseStateSchema,
    subject: z.string(),
    /**
     * Free text the person pasted so a human can find the thing they mean.
     *
     * NULLABLE, NOT OPTIONAL, and never a link: the backend deliberately stores a string
     * rather than an order id, so there is nothing here to navigate to and nothing to look up.
     */
    orderReference: z.string().nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    decidedAt: z.iso.datetime().nullable(),
  })
  .strip();
export type SupportCaseSummary = z.infer<typeof SupportCaseSummarySchema>;

export const SupportCaseDetailSchema = SupportCaseSummarySchema.extend({
  description: z.string(),
  decisionNote: z.string().nullable(),
  messages: z.array(SupportCaseMessageSchema),
  /**
   * Whether the composer should be rendered at all.
   *
   * ⚠️ **READ THIS, DO NOT RECOMPUTE IT.** A `resolved` case is reopenable by replying, but
   * only inside a window the backend measures from its own clock. A client deriving its own
   * answer would eventually disagree with the server — showing a composer that 409s, or hiding
   * one that would have worked.
   */
  canOpenerReply: z.boolean(),
}).strip();
export type SupportCaseDetail = z.infer<typeof SupportCaseDetailSchema>;

/** The queue row adds the person, which the opener's own projection has no reason to carry. */
export const StaffSupportCaseSummarySchema = SupportCaseSummarySchema.extend({
  openedByUserId: z.string(),
  openerName: z.string(),
  openerHandle: z.string().nullable(),
}).strip();
export type StaffSupportCaseSummary = z.infer<typeof StaffSupportCaseSummarySchema>;

export const StaffSupportCaseDetailSchema = StaffSupportCaseSummarySchema.extend({
  description: z.string(),
  decisionNote: z.string().nullable(),
  messages: z.array(SupportCaseMessageSchema),
}).strip();
export type StaffSupportCaseDetail = z.infer<typeof StaffSupportCaseDetailSchema>;

export interface OpenSupportCaseInput {
  readonly category: SupportCaseCategory;
  readonly subject: string;
  readonly description: string;
  readonly orderReference?: string;
}

export interface ListOwnSupportCasesFilter {
  readonly state?: SupportCaseState;
  readonly cursor?: string;
}

export interface ListSupportCaseQueueFilter {
  readonly state?: SupportCaseState;
  readonly category?: SupportCaseCategory;
  readonly cursor?: string;
}

/**
 * What each state means TO THE PERSON WHO OPENED THE CASE — not what it means to staff.
 *
 * "Waiting for support" rather than "open", because a queue word tells somebody nothing about
 * whose turn it is. `awaiting_user` is the one state that asks them to act, and it says so.
 */
export const SUPPORT_CASE_STATE_LABELS: Readonly<Record<SupportCaseState, string>> = {
  open: "Waiting for support",
  awaiting_user: "Waiting for your reply",
  resolved: "Resolved",
  closed: "Closed",
};

/** The staff-facing reading of the same column, where the queue word IS the useful one. */
export const SUPPORT_CASE_STATE_QUEUE_LABELS: Readonly<Record<SupportCaseState, string>> = {
  open: "Needs an answer",
  awaiting_user: "Waiting on them",
  resolved: "Resolved",
  closed: "Closed",
};

/** What somebody picks from when opening a case, in the order the form shows them. */
export const SUPPORT_CASE_CATEGORY_LABELS: Readonly<Record<SupportCaseCategory, string>> = {
  payment_problem: "A payment — money sent, or money not received",
  order_problem: "An order — what arrived, or has not",
  account_problem: "My account, my data, or signing in",
  content_problem: "Something on Qatoto that should not be here",
  technical_problem: "Something on the site is broken",
  other: "Something else",
};

/** The label for the staff side of a thread. There is never a person's name here. */
export const SUPPORT_STAFF_AUTHOR_LABEL = "Qatoto support";

/**
 * Mirrors of the server minimums, so the submit button does not invite a 422.
 *
 * COURTESY, NOT VALIDATION. The backend re-checks every one of these and its CHECK
 * constraints are the authority; these exist only so a person is not told "no" after typing.
 */
export const SUPPORT_CASE_SUBJECT_MAXIMUM_LENGTH = 200;
export const SUPPORT_CASE_DESCRIPTION_MAXIMUM_LENGTH = 4000;
export const SUPPORT_CASE_ORDER_REFERENCE_MAXIMUM_LENGTH = 100;
export const SUPPORT_CASE_MESSAGE_MAXIMUM_LENGTH = 4000;
