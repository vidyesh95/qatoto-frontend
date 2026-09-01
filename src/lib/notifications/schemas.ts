// TRANSPORT: props-only — pure contract for the three `/notifications` routes. No network, no React.
//
// THE 26 KINDS ARE POSTGRES `pgEnum` LABELS, SENT VERBATIM IN snake_case. The authority is
// `src/db/schema/platform.ts:442` in the backend repo and the `enqueueNotifications` call sites
// beside it — never a doc, which drifts. Do not "correct" one of these to kebab-case: they are
// data that must byte-match the label, not identifiers.
//
// `kind` IS PARSED AS A PLAIN STRING, NOT `z.enum(NOTIFICATION_KINDS)`, and that is the one
// deliberate loosening on this boundary. A `z.enum` over 26 labels means the next backend release
// that adds a 27th makes `safeParse` fail on the row that carries it — and because the rows are
// parsed as a page, ONE unknown kind would blank the WHOLE inbox rather than one line of it. That
// trade is wrong for a surface whose entire job is telling someone what happened. The tuple below
// still exists and is still exhaustive over what ships today; `isKnownNotificationKind` narrows to
// it, and `format.ts` switches on the narrowed type with a `never` default, so adding a kind to the
// tuple is a compile error until its sentence is written. An UNKNOWN kind renders a generic line.
//
// This is the same forward-compatibility argument `.strip()` is here for, applied one level down.

import { z } from "zod";

/**
 * Every notification kind the backend can send today, grouped as the enum itself groups them.
 *
 * The comments name the section of `R_AND_D_BACKEND_STRUCTURE.md` each group answers to, because
 * that is where the reason a given event notifies anyone at all is written down.
 */
export const NOTIFICATION_KINDS = [
  // §5 — team formation. Both halves: an invite is a two-sided conversation and the person who
  // sent it is the one waiting on the answer.
  "project_invite_received",
  "project_invite_revoked",
  "project_invite_accepted",
  "project_invite_declined",
  "project_application_received",
  "project_application_accepted",
  "project_application_declined",
  // §7A — the compensation lifecycle. The finalized statement is the product's headline output
  // and was, before these existed, delivered by hoping somebody refreshed the page.
  "compensation_agreement_proposed",
  "compensation_agreement_accepted",
  "compensation_agreement_declined",
  "compensation_agreement_withdrawn",
  "compensation_period_finalized",
  "compensation_period_countersigned",
  "compensation_period_superseded",
  "compensation_payment_recorded",
  "compensation_payment_confirmed",
  // §9 — the things that move equity, including the two nobody was ever told about: a dispute
  // freezes another member's slices, and a verdict withholds them.
  "dispute_raised",
  "dispute_resolved",
  "effort_claim_verdict_reached",
  // §10 — a moderator's verdict on something a person submitted. A program sits `pending` and
  // invisible until reviewed, and a paper sits `queued`; the submitter otherwise has no way to
  // learn the answer except by re-checking the page.
  "research_program_published",
  "research_program_rejected",
  "research_program_paper_moderated",
  // Video moderation — TWO KINDS, TWO AUDIENCES, and the asymmetry between them is the point.
  //
  // `video_report_decided` goes to whoever filed the report, on EVERY close. They asked a
  // question; they get an answer, and a `redirected_to_source` outcome is an answer rather than
  // a refusal.
  //
  // ⚠️ `video_content_actioned` goes to the creator ONLY when their video was hidden or
  // restored — NEVER on a dismissal or a redirect. Nothing happened to their video in those
  // cases, and telling somebody "you were reported and we let it go" hands them a grievance
  // plus a very small suspect pool. That is the same retaliation risk that keeps reporter
  // identity hidden from moderators in the first place.
  //
  // NEITHER NAMES THE MODERATOR. Both are enqueued with `actorUserId: null`, so `actorName`
  // arrives as `null` and the sentences below must read without one.
  "video_report_decided",
  "video_content_actioned",
  // §4a — staff roles. The proposal goes to the other admins, who are who can countersign it;
  // the outcome goes to the subject, who until now could be made a moderator without being told.
  "platform_role_change_proposed",
  "platform_role_changed",
  // Support cases — THREE KINDS, TWO AUDIENCES.
  //
  // `support_case_opened` goes to STAFF and is the reason the queue is not poll-only: a case
  // sitting unread is the product failing at the one job it has.
  //
  // The other two go to the person who opened the case. `support_case_decided` carries BOTH
  // verdicts — resolved and closed — because one kind whose sentence names neither is better
  // than a sentence that guesses. ⚠️ NEITHER NAMES THE STAFF MEMBER: both are enqueued with
  // `actorUserId: null`, so `actorName` arrives as `null` and the sentences must read without
  // one.
  "support_case_opened",
  "support_case_replied",
  "support_case_decided",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Narrows the untrusted `kind` string to the tuple above. Anything else renders generically. */
export function isKnownNotificationKind(kind: string): kind is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(kind);
}

/**
 * IDS AND INTEGERS, NEVER PROSE — the backend's own constraint, mirrored here so a payload that
 * ever arrives holding a nested object or a pre-formatted amount fails the parse instead of
 * reaching a reader.
 *
 * The client composes every sentence from `kind` plus these values. That is what keeps the three
 * clients localizable, and it is why `format.ts` exists.
 */
export const NotificationPayloadSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

/**
 * One row of the inbox.
 *
 * EVERY NULLABLE FIELD IS GENUINELY NULLABLE AND NONE MAY BE DEFAULTED.
 * `actorUserId`/`actorName` are NULL for a SYSTEM ACTOR — a nightly job, or the verification
 * pipeline — and rendering "Someone" there would invent a person. `projectId`/`projectSlug`/
 * `projectName` are NULL for the programme and staff-role kinds: a programme is not a project,
 * which is the case the column was left nullable for.
 */
export const NotificationRowSchema = z
  .object({
    id: z.string(),
    kind: z.string(),
    projectId: z.string().nullable(),
    projectSlug: z.string().nullable(),
    projectName: z.string().nullable(),
    actorUserId: z.string().nullable(),
    actorName: z.string().nullable(),
    payload: NotificationPayloadSchema,
    readAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
  })
  .strip();
export type NotificationRow = z.infer<typeof NotificationRowSchema>;

/**
 * `GET /notifications` — a NESTED OBJECT under `data`, not a bare array with a sibling cursor.
 *
 * Worth stating because the R&D claim lists look similar and are not: those answer
 * `{ data: [...], nextCursor }` and need `getCursorSiblingList`. This one parses with `getJson`.
 *
 * `unreadCount` rides along here as well as on its own route. The BADGE must not read it — see
 * the header of `src/hooks/notifications.ts`.
 */
export const NotificationPageSchema = z
  .object({
    notifications: z.array(NotificationRowSchema),
    nextCursor: z.string().nullable(),
    unreadCount: z.number(),
  })
  .strip();
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

/** `GET /notifications/unread-count` — the badge alone, on its own partial index. */
export const UnreadNotificationCountSchema = z.object({ unreadCount: z.number() }).strip();
export type UnreadNotificationCount = z.infer<typeof UnreadNotificationCountSchema>;

/** `POST /notifications/read`. `markedCount` is 0 when everything through that row was read. */
export const MarkNotificationsReadResultSchema = z.object({ markedCount: z.number() }).strip();
export type MarkNotificationsReadResult = z.infer<typeof MarkNotificationsReadResultSchema>;

/**
 * The list query. `.strict()` on the backend, so nothing else may be sent.
 *
 * `cursor` is OPAQUE and SERVER-ISSUED. It is never constructed, compared or decoded here — a
 * fabricated one is a `422 CURSOR_MALFORMED`, which the backend answers deliberately rather than
 * silently restarting the feed at page one.
 */
export interface ListNotificationsFilter {
  readonly cursor?: string;
  readonly limit?: number;
}

/** The backend's own cap, duplicated so a caller cannot send a 51 and earn a 422 for it. */
export const NOTIFICATION_PAGE_LIMIT_MAXIMUM = 50;
