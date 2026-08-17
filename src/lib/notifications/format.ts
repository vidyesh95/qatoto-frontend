// TRANSPORT: props-only — pure. No network, no `Date`, no JSX, no React.
//
// THE CLIENT COMPOSES EVERY SENTENCE. The wire carries `kind` plus a payload of ids and integers
// and nothing else, so that the three clients can each localize their own copy and no
// pre-formatted amount or English string is ever frozen into a database row. This module is the
// web client's half of that bargain: 25 kinds in, one sentence out.
//
// TWO RULES IT EXISTS TO ENFORCE, and both are why the switch is long rather than clever:
//
//  1. NEVER PRINT A RAW WIRE TOKEN AT A READER. Not a snake_case enum label, not a payload key,
//     not a uuid. Anything that reaches the screen was written here, in English, on purpose.
//  2. NEVER FABRICATE THE ABSENT HALF. A NULL `actorName` means a SYSTEM ACTOR — a nightly job or
//     the verification pipeline — so the sentence becomes "Your effort claim was verified", never
//     "Someone verified your effort claim". Each case below carries both phrasings rather than a
//     shared `actorName ?? "Someone"` default, because that default is the bug.
//
// THE ENUM MAPS ARE LOCAL RATHER THAN IMPORTED FROM `@/lib/rnd/labels`, deliberately, for two
// reasons. The payload values arrive as untyped strings, so every lookup needs an unknown-value
// fallback that a `Record<Enum, string>` cannot express. And this module is loaded by the navbar
// on EVERY page of three route groups — importing the R&D label maps would drag their schema
// modules into that bundle for a handful of phrases. The maps here are sentence fragments anyway,
// not the chip labels those maps hold.

import {
  isKnownNotificationKind,
  type NotificationKind,
  type NotificationPayload,
  type NotificationRow,
} from "@/lib/notifications/schemas";

/** One rendered row's text. `context` is the project it happened in, or null when there is none. */
export interface NotificationSentence {
  readonly headline: string;
  /** `projectName` when the server sent one. Never derived from a slug or an id. */
  readonly context: string | null;
}

/** `project_application_kind`. Which affordance the application came from. */
const APPLICATION_KIND_PHRASES: Record<string, string | undefined> = {
  role_interest: "applied for an open role",
  join_request: "asked to join",
};

/** `engagement_kind`. Lowercase noun phrases, because every use below slots mid-sentence. */
const ENGAGEMENT_KIND_PHRASES: Record<string, string | undefined> = {
  employee: "an employee agreement",
  independent_contractor: "an independent-contractor agreement",
  unpaid_founder: "an unpaid-founder agreement",
};

/**
 * `dispute_resolution`. Whole sentences rather than fragments: what each verdict DOES to the
 * claim is the only thing the reader is opening this for, and it differs per value.
 *
 * `re_verified` deliberately promises no number. That resolution answers `202` — the scoped
 * re-verification is queued and the re-derived figure does not exist yet.
 */
const DISPUTE_RESOLUTION_SENTENCES: Record<string, string | undefined> = {
  upheld: "The dispute was upheld. The claim settles at the slices that were proposed.",
  voided: "The dispute was voided. The claim settles at zero slices.",
  re_verified: "The dispute goes to a scoped re-verification. The re-derived number is not in yet.",
};

/**
 * `effort_verification_status`, terminal values only — a run in flight never notifies.
 *
 * The three that can arrive are `verified`, `flagged_for_review` and `unverified`; the fallback
 * covers a fourth the backend has not shipped.
 */
const CLAIM_VERDICT_SENTENCES: Record<string, string | undefined> = {
  verified: "Your effort claim was verified.",
  flagged_for_review: "Your effort claim was flagged for review.",
  unverified: "Your effort claim could not be verified — no digital receipts backed it.",
};

/** `platform_role`, plus the `"none"` the backend substitutes for a null role. */
const PLATFORM_ROLE_PHRASES: Record<string, string | undefined> = {
  moderator: "moderator",
  auditor: "auditor",
  admin: "admin",
  none: "no staff role",
};

/** The three kinds whose subject lives on the proof-of-effort route rather than the project page. */
const PROOF_OF_EFFORT_KINDS: readonly NotificationKind[] = [
  "dispute_raised",
  "dispute_resolved",
  "effort_claim_verdict_reached",
];

/** A payload value, only when it is a non-empty string. Ids and enum labels are both strings. */
function readPayloadString(payload: NotificationPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * The line a reader scans, and the project it belongs to.
 *
 * An unrecognised `kind` gets a deliberately vague headline. Naming the kind would print a raw
 * snake_case label at somebody, which is the one thing this module exists to prevent — and the
 * row still links wherever its payload can reach, so the update is not lost, only unlabelled.
 */
export function buildNotificationSentence(notification: NotificationRow): NotificationSentence {
  const headline = isKnownNotificationKind(notification.kind)
    ? buildKnownHeadline(notification.kind, notification)
    : "There is an update for you.";

  return { headline, context: notification.projectName };
}

function buildKnownHeadline(kind: NotificationKind, notification: NotificationRow): string {
  const { actorName, payload } = notification;

  switch (kind) {
    // --- §5, invites ---------------------------------------------------------------------

    case "project_invite_received": {
      const roleTitle = readPayloadString(payload, "roleTitle");
      const invitation = roleTitle === null ? "to join the team" : `to join as ${roleTitle}`;
      return actorName === null
        ? `You were invited ${invitation}.`
        : `${actorName} invited you ${invitation}.`;
    }
    case "project_invite_revoked":
      return actorName === null
        ? "Your invitation was withdrawn."
        : `${actorName} withdrew your invitation.`;
    case "project_invite_accepted":
      return actorName === null
        ? "Your invitation was accepted."
        : `${actorName} accepted your invitation.`;
    case "project_invite_declined":
      return actorName === null
        ? "Your invitation was declined."
        : `${actorName} declined your invitation.`;

    // --- §5, applications ----------------------------------------------------------------

    case "project_application_received": {
      // A person always exists here — an application cannot have a system actor — so "Someone"
      // is a true statement about an unnamed applicant rather than an invented one.
      const applicationPhrase =
        APPLICATION_KIND_PHRASES[readPayloadString(payload, "kind") ?? ""] ?? "applied";
      return actorName === null
        ? `Someone ${applicationPhrase}.`
        : `${actorName} ${applicationPhrase}.`;
    }
    case "project_application_accepted":
      return actorName === null
        ? "Your application was accepted."
        : `${actorName} accepted your application.`;
    case "project_application_declined":
      return actorName === null
        ? "Your application was declined."
        : `${actorName} declined your application.`;

    // --- §7A, agreements -----------------------------------------------------------------

    case "compensation_agreement_proposed": {
      const agreement =
        ENGAGEMENT_KIND_PHRASES[readPayloadString(payload, "engagementKind") ?? ""] ??
        "a compensation agreement";
      return actorName === null
        ? `You were sent ${agreement} to accept.`
        : `${actorName} proposed ${agreement}.`;
    }
    case "compensation_agreement_accepted":
      return actorName === null
        ? "The agreement you proposed was accepted."
        : `${actorName} accepted the agreement you proposed.`;
    case "compensation_agreement_declined":
      return actorName === null
        ? "The agreement you proposed was declined."
        : `${actorName} declined the agreement you proposed.`;
    case "compensation_agreement_withdrawn":
      return actorName === null
        ? "The agreement was withdrawn."
        : `${actorName} withdrew the agreement.`;

    // --- §7A, statements -----------------------------------------------------------------

    case "compensation_period_finalized":
      return actorName === null
        ? "Your month-end statement was finalized."
        : `${actorName} finalized your month-end statement.`;
    case "compensation_period_countersigned":
      return actorName === null
        ? "The statement you finalized was countersigned."
        : `${actorName} countersigned the statement you finalized.`;
    case "compensation_period_superseded":
      return actorName === null
        ? "A later statement has superseded one of yours."
        : `${actorName} finalized a later statement, superseding one of yours.`;

    // --- §7A, payments. A RECORD, NEVER A TRANSFER. Escrow left this codebase, so nothing here
    // may say a payment was "collected", "escrowed" or held by the platform. Someone typed that
    // it happened; someone else confirms it. -----------------------------------------------

    case "compensation_payment_recorded":
      return actorName === null
        ? "A payment was recorded against your statement line."
        : `${actorName} recorded a payment against your statement line.`;
    case "compensation_payment_confirmed":
      return actorName === null
        ? "The payment you recorded was confirmed."
        : `${actorName} confirmed the payment you recorded.`;

    // --- §9, equity ----------------------------------------------------------------------

    case "dispute_raised":
      // The recipient IS the subject of the dispute — the backend addresses this one to the
      // member whose allocation is contested, which is why "your" is safe here.
      return actorName === null
        ? "A dispute was raised against your allocation."
        : `${actorName} raised a dispute against your allocation.`;
    case "dispute_resolved":
      return (
        DISPUTE_RESOLUTION_SENTENCES[readPayloadString(payload, "resolution") ?? ""] ??
        "The dispute was resolved."
      );
    case "effort_claim_verdict_reached":
      // `actorUserId` is explicitly null at the call site: the verification pipeline decided
      // this, not a person. There is no actor branch because there can never be an actor.
      return (
        CLAIM_VERDICT_SENTENCES[readPayloadString(payload, "verdict") ?? ""] ??
        "A verdict was reached on your effort claim."
      );

    // --- §10, moderation. THE DECIDING MODERATOR IS NOT NAMED, deliberately. The payload can
    // carry them, but a moderator whose verdicts are attributed to them by name is a moderator
    // who can be lobbied — the same open question §J raises about naming a reporter. The
    // outcome is the fact the submitter needs; who decided it is not. ----------------------

    case "research_program_published":
      return "Your programme was published.";
    case "research_program_rejected":
      return "Your programme was not accepted.";
    case "research_program_paper_moderated": {
      const decision = readPayloadString(payload, "decision");
      if (decision === "published") return "Your paper was published to the programme.";
      if (decision === "rejected") return "Your paper was not accepted.";
      return "Your paper was reviewed.";
    }

    // --- §4a, staff roles ----------------------------------------------------------------

    case "platform_role_change_proposed": {
      const nextRole = PLATFORM_ROLE_PHRASES[readPayloadString(payload, "nextRole") ?? ""];
      const change = nextRole === undefined ? "A staff-role change" : `A change to ${nextRole}`;
      return actorName === null
        ? `${change} was proposed and needs countersigning.`
        : `${actorName} proposed ${change.toLowerCase()}, which needs countersigning.`;
    }
    case "platform_role_changed": {
      const previousRole = PLATFORM_ROLE_PHRASES[readPayloadString(payload, "previousRole") ?? ""];
      const nextRole = PLATFORM_ROLE_PHRASES[readPayloadString(payload, "nextRole") ?? ""];
      if (previousRole === undefined || nextRole === undefined) return "Your staff role changed.";
      return `Your staff role changed from ${previousRole} to ${nextRole}.`;
    }

    default: {
      const exhaustiveCheck: never = kind;
      return exhaustiveCheck;
    }
  }
}

/**
 * Where the row goes, or null when there is nowhere it can honestly go.
 *
 * A ROW WITHOUT A DESTINATION IS TEXT, NOT A DEAD LINK. Two cases return null on purpose:
 *
 *  - `platform_role_changed` is addressed to the SUBJECT of the change, who may hold no staff
 *    role at all once it lands. Sending them to `/admin/staff` is a gate, not a destination.
 *    Its sibling `platform_role_change_proposed` goes to the admins who can countersign it, and
 *    they can open that console — so only that one links.
 *  - Anything with no `projectSlug` and no `programSlug`. The project route is keyed on the SLUG,
 *    not `projectId`, which is why the row carries both.
 */
export function buildNotificationHref(notification: NotificationRow): string | null {
  const programSlug = readPayloadString(notification.payload, "programSlug");
  if (programSlug !== null) return `/research-and-development/programs/${programSlug}`;

  if (notification.kind === "platform_role_change_proposed") return "/admin/staff";
  if (notification.projectSlug === null) return null;

  const projectHref = `/research-and-development/project/${notification.projectSlug}`;
  const isProofOfEffortSubject =
    isKnownNotificationKind(notification.kind) && PROOF_OF_EFFORT_KINDS.includes(notification.kind);

  return isProofOfEffortSubject ? `${projectHref}/proof-of-effort` : projectHref;
}
