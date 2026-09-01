// TRANSPORT: props-only — authored copy over links. Fetches nothing.
//
// TRIAGE FIRST, A CASE SECOND, and the ordering is the whole argument of this page. Every
// problem below already has a surface that RECORDS it — an order, a dispute, a settlement
// attestation, a report — and going straight there is faster and leaves a better trace than
// describing it to somebody who would only send you there. The support case underneath exists
// for what has no surface, and for when the surface did not answer.
//
// ⚠️ THE MONEY GROUP LEADS, AND IT MAY NEVER PROMISE A RECOVERY. Qatoto holds no funds: there
// is no escrow, nothing to release and nothing to refund from here. What these rows can do is
// point at the record of what happened. Any wording that suggests support can reverse a
// payment is a promise this platform cannot keep.
//
// SIGNED-OUT VISITORS READ THIS. The sidebar's "Help and settings" row carries no session
// requirement, so every link here must work without an account — which is also why the one
// row about signing in points at recovery and an email rather than at a form nobody could
// reach.
import Link from "next/link";

/** One problem, and the surface that already holds it. */
interface TriageRow {
  readonly problem: string;
  readonly answer: React.ReactNode;
}

interface TriageGroup {
  readonly heading: string;
  readonly rows: readonly TriageRow[];
}

const TRIAGE_GROUPS: readonly TriageGroup[] = [
  {
    heading: "Money you sent, or money you have not received",
    rows: [
      {
        problem: "You paid and the order does not show it",
        answer: (
          <>
            Open the order in{" "}
            <Link href="/orders-and-returns" className="underline">
              Orders and returns
            </Link>{" "}
            — its payment panel holds every attempt against it and the provider&apos;s own reference
            for each. That reference is what a conversation about a missing payment starts from.
          </>
        ),
      },
      {
        problem: "You paid outside Qatoto, or the other side says they never received it",
        answer: (
          <>
            Record what you did on the order itself. Both sides state what they sent and what
            arrived, side by side, and the disagreement stays visible rather than becoming one
            person&apos;s word. Qatoto does not verify either claim — it holds no money and sees no
            bank account.
          </>
        ),
      },
      {
        problem: "The two of you disagree about what happened",
        answer: (
          <>
            A dispute is a formal record between the two parties, not a message to Qatoto. Raise and
            track one from{" "}
            <Link href="/disputes" className="underline">
              Disputes
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "An order, or work you commissioned",
    rows: [
      {
        problem: "An order you placed, or one placed with you",
        answer: (
          <>
            <Link href="/orders-and-returns" className="underline">
              Orders and returns
            </Link>{" "}
            holds every order and its current state, including the arrival window for each. Sellers
            see the same orders under Studio.
          </>
        ),
      },
      {
        problem: "Work you commissioned",
        answer: (
          <>
            <Link href="/service-engagements" className="underline">
              Service engagements
            </Link>{" "}
            tracks agreed work, its milestones and what has been delivered.
          </>
        ),
      },
    ],
  },
  {
    heading: "The other party",
    rows: [
      {
        problem: "A question for a seller or a provider",
        answer: (
          <>
            Talk to them directly in{" "}
            <Link href="/messages" className="underline">
              Messages
            </Link>
            . A thread is scoped to the thing it is about, so open it from the order, quote or
            inquiry rather than starting a new one.
          </>
        ),
      },
    ],
  },
  {
    heading: "Content and safety",
    rows: [
      {
        problem: "A video that should not be on Qatoto",
        answer: (
          <>
            Report it from the video itself — the control is under the player. A report is reviewed
            by a person, so nothing is hidden automatically and there is no instant outcome to wait
            for. What came of the ones you filed is in{" "}
            <Link href="/report-history" className="underline">
              Report history
            </Link>
            .
          </>
        ),
      },
      {
        problem: "A security vulnerability",
        answer: (
          <>
            Please follow the{" "}
            <Link href="/vulnerability-disclosure-policy" className="underline">
              Vulnerability Disclosure Policy
            </Link>{" "}
            rather than reporting it through an ordinary channel.
          </>
        ),
      },
    ],
  },
  {
    heading: "Your account and your data",
    rows: [
      {
        problem: "Your account, your data, or deleting either",
        answer: (
          <>
            Account settings hold your profile, your privacy controls and your data export and
            deletion requests. What Qatoto stores and why is set out in the{" "}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </>
        ),
      },
      {
        problem: "You cannot sign in at all",
        answer: (
          <>
            Start with{" "}
            <Link href="/forgot-password" className="underline">
              password recovery
            </Link>
            . A support case needs an account to open, so if recovery does not get you back in,
            write to us from{" "}
            <Link href="/contact-us" className="underline">
              Contact Us
            </Link>{" "}
            instead — that is the one channel that does not need a session.
          </>
        ),
      },
    ],
  },
];

export default function TriageDirectory() {
  return (
    <div className="space-y-6">
      <p className="text-sm leading-5 text-muted-foreground">
        Most problems have a page that already records them, and going straight there is faster than
        describing it to someone who would send you there. If none of these fits, open a case below
        and a person will answer it.
      </p>

      {TRIAGE_GROUPS.map((group) => (
        <section key={group.heading} aria-label={group.heading}>
          <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
            {group.heading}
          </h2>
          <dl className="mt-2 space-y-3">
            {group.rows.map((row) => (
              <div key={row.problem} className="rounded-xl border border-border px-4 py-3">
                <dt className="text-sm font-medium text-foreground">{row.problem}</dt>
                <dd className="mt-1 text-sm leading-5 text-muted-foreground">{row.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* The doctrine, said once and in the open rather than implied by omission. */}
      <p className="rounded-xl bg-muted px-4 py-3 text-xs leading-4 text-muted-foreground">
        Qatoto holds no money. There is no escrow here, so nothing on this page — a case included —
        can release, reverse or refund a payment. What support can do is find out what happened and
        point you at the record of it.
      </p>
    </div>
  );
}
