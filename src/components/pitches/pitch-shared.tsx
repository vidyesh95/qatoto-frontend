// TRANSPORT: props-only — pure rendering, no network.
//
// The two pieces the studio console and the public pitch page must render IDENTICALLY,
// which is why they live here rather than being written twice.
//
// Shared because both are load-bearing for the same reason: Qatoto lists pitches, holds no
// funds and vets nothing beyond spam and scams. `PitchDisclaimer` is the sentence that makes
// that true to a reader, and `ExternalLinkOut` is what stops an outbound link behaving like
// an endorsement or a same-site navigation. Two copies of either would drift, and the half
// that drifted would be the half a court read.

import { formatMoneyFromCents } from "@/lib/rnd/format";
import { PITCH_STATUS_LABELS, type PitchStatus } from "@/lib/rnd/pitches.schemas";

/**
 * A link to somewhere Qatoto does not control.
 *
 * FOUR THINGS, EACH DELIBERATE:
 *
 *  - `rel="noopener noreferrer nofollow ugc"` — `noopener` so the destination cannot reach
 *    back through `window.opener`, `nofollow ugc` so a pitch page cannot be farmed for
 *    SEO by anyone who can post one.
 *  - `target="_blank"` — leaving Qatoto should be a deliberate act, not a navigation that
 *    loses the reader's place.
 *  - THE HOST IS SHOWN. A reader deciding whether to follow a funding link is entitled to
 *    know where it goes before they click, and a label alone can say anything.
 *  - A visible "you are leaving Qatoto" cue, for the same reason.
 *
 * The URL was normalized and refused-if-dangerous server-side (https only, no credentials);
 * this is the rendering half of that contract, not a substitute for it.
 */
export function ExternalLinkOut({
  href,
  label,
}: {
  readonly href: string;
  readonly label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="inline-flex flex-wrap items-baseline gap-x-2 text-sm text-foreground underline"
    >
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{describeLinkDestination(href)} ↗</span>
    </a>
  );
}

/**
 * The host, for the label beside a link.
 *
 * Falls back to the raw string rather than throwing: the server only ever stores a parsed,
 * normalized URL, so an unparseable one here means something upstream changed — and showing
 * it plainly is more honest than rendering nothing where a destination belongs.
 */
export function describeLinkDestination(rawUrl: string): string {
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl;
  }
}

/**
 * ⚠️ THE LIABILITY POSITION, NOT DECORATION. Do not trim this to a footer, a tooltip, or a
 * link to the terms.
 *
 * Qatoto reviews pitches for spam, scams and illegal content ONLY — never on merit — and
 * that light gate is exactly what keeps listing a pitch from reading as endorsing it. This
 * sentence is what tells a reader so. Kickstarter reviews every project and says in as many
 * words that review is not endorsement; this is that sentence.
 *
 * It renders wherever a pitch does, on the public page and in the founder's own console.
 */
export function PitchDisclaimer() {
  return (
    <p className="rounded-xl bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground">
      Qatoto lists pitches. It does not vet, endorse or verify them, does not hold or transfer
      funds, and takes no part in any funding that follows. Any money moves between you and the
      founder, on whatever platform their link points to. Check who you are dealing with.
    </p>
  );
}

/** The status badge. One place, so the studio and the public page cannot disagree. */
export function PitchStatusBadge({ status }: { readonly status: PitchStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[status]}`}>
      {PITCH_STATUS_LABELS[status]}
    </span>
  );
}

const STATUS_BADGE_CLASS: Record<PitchStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  pending: "bg-secondary text-foreground",
  published: "bg-foreground text-background",
  rejected: "bg-destructive/10 text-destructive",
  closed: "bg-secondary text-muted-foreground",
};

/**
 * A reported outcome, rendered as what it is.
 *
 * ⚠️ THE UNCONFIRMED BRANCH IS THE WHOLE POINT OF THIS COMPONENT. An outcome with one
 * signature is one person's claim about money that moved somewhere Qatoto cannot see.
 * Rendering it the same as a countersigned one would let a founder announce a raise through
 * Qatoto's voice with nobody agreeing — so the label says who said it, and says that the
 * other party has not.
 *
 * Even the confirmed branch says "both parties report", never "raised" or "received".
 */
export function OutcomeAttestationNote({
  isConfirmed,
  isConfirmable,
  recordedByName,
}: {
  readonly isConfirmed: boolean;
  /** False when no Qatoto account is named for the funder — nobody can ever countersign. */
  readonly isConfirmable: boolean;
  readonly recordedByName: string;
}) {
  // THE THIRD STATE, and it exists because the live run found it: a record naming only a
  // funder's NAME has one party and no possible second signature, so it can never become
  // public. Saying "not yet confirmed" there would promise a confirmation that cannot come.
  if (!isConfirmed && !isConfirmable) {
    return (
      <span className="text-xs text-muted-foreground">
        Recorded by {recordedByName || "one party"} · <strong>private</strong> — no Qatoto account
        was named for the funder, so nobody can confirm it and it stays off the public page
      </span>
    );
  }
  if (!isConfirmed) {
    return (
      <span className="text-xs text-muted-foreground">
        Reported by {recordedByName || "one party"} · <strong>not yet confirmed</strong> by the
        other party
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      Both parties report this. Self-reported — Qatoto did not verify or handle it.
    </span>
  );
}

/**
 * Money, from the decimal string the wire carries.
 *
 * DELEGATES TO `formatMoneyFromCents` rather than doing the arithmetic here. That helper
 * already handles the two things that matter and were about to be got wrong locally: it
 * parses with `BigInt(…)` calls instead of `100n` literals, because tsconfig targets ES2017
 * where a bigint literal is a compile error, and it falls back to an exact unlocalized label
 * past `Number.MAX_SAFE_INTEGER` instead of rounding a funding figure.
 */
export function formatOutcomeAmount(amountInCents: string, currencyCode: string): string {
  try {
    return formatMoneyFromCents(BigInt(amountInCents), currencyCode);
  } catch {
    // An unparseable amount means the wire contract changed; show it raw rather than
    // rendering a zero, which would be a different number rather than a visible fault.
    return `${currencyCode} ${amountInCents}`;
  }
}
