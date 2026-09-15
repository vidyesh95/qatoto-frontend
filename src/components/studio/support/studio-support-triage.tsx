// TRANSPORT: props-only — authored copy over links. Fetches nothing.
//
// THE SELLER'S HALF OF `triage-directory.tsx`, AND IT IS A SEPARATE FILE ON PURPOSE.
//
// The buyer directory at `components/home/customer-service/triage-directory.tsx` routes the same
// problems to the other side of every table: its order row points at `/orders-and-returns`, which
// is what a seller's order is NOT. Sharing one component and branching on a `side` prop was
// considered and rejected: five groups where every row's destination, wording and subject differ is
// two directories wearing one name, and the branch would have to be read on every future edit to
// learn which half it was describing. The shape is shared; the rows are not.
//
// TRIAGE FIRST, A CASE SECOND, which is the buyer page's argument and survives unchanged here.
// Every problem below already has a surface that RECORDS it, and going straight there is faster and
// leaves a better trace than describing it to somebody who would only send you there. The case
// underneath is for what has no surface, and for when the surface did not answer.
//
// ⚠️ EVERY `href` MUST BE A ROUTE THAT WORKS. `site-capabilities.ts` states the rule for the
// roadmap and it binds harder here, because a reader arrives at this page already stuck: linking
// a `StudioPlannedPage` stub would spend their trust to tell them "not built yet" a second time.
// `/studio/learn` and `/studio/subtitles` are the two left, and neither is linked below.
//
// ⚠️ THIS LINE NAMED `/studio/feedback` AMONG THEM AND NO LONGER DOES, because that route
// graduated. It is still not linked from here, for a different and better reason: feedback ends
// in nobody answering, so sending somebody who is stuck to a channel that cannot reply would be
// the same disservice in a nicer wrapper. The traffic goes the other way — `/studio/feedback`
// points AT this surface for anything blocking.
//
// ⚠️ NO SEGMENT WITHOUT AN INDEX. `/studio/orders` and `/studio/service-engagements` resolve only
// at `[orderId]` / `[engagementId]`; the list collapsed into `/studio/sales` and `/service-
// engagements` respectively. Rows describe how those are reached instead of linking the segment.
//
// ⚠️ THE MONEY GROUP LEADS, AND IT MAY NEVER PROMISE A RECOVERY. Qatoto holds no funds: no escrow,
// nothing to release, nothing to refund from here. No copy in this file may say "paid",
// "collected", "escrowed" or "payout" about a commitment (PRODUCT.md). What these rows can do is
// point at the record of what happened.
import Link from "next/link";

/** One problem a seller has, and the surface that already holds it. */
interface TriageRow {
  readonly problem: string;
  readonly answer: React.ReactNode;
}

interface TriageGroup {
  readonly heading: string;
  readonly rows: readonly TriageRow[];
}

const SELLER_TRIAGE_GROUPS: readonly TriageGroup[] = [
  {
    heading: "Money a buyer sent, or money you are owed",
    rows: [
      {
        problem: "You want to know what has settled to you",
        answer: (
          <>
            <Link href="/studio/earn" className="underline">
              Earn
            </Link>{" "}
            holds what has settled, what came back, and what nobody has counted yet. Profit and
            margin are not there, because nothing on Qatoto records what you paid for your goods.
          </>
        ),
      },
      {
        problem: "A buyer says they paid and the order does not show it",
        answer: (
          <>
            Open the order from{" "}
            <Link href="/studio/sales" className="underline">
              Sales
            </Link>
            . Its payment panel holds every attempt made against that order and the provider&apos;s
            own reference for each. That reference is what a conversation about a missing payment
            starts from.
          </>
        ),
      },
      {
        problem: "You and the buyer disagree about what happened",
        answer: (
          <>
            A dispute is a formal record between the two parties, not a message to Qatoto. Raise and
            track one from{" "}
            <Link href="/disputes" className="underline">
              Disputes
            </Link>
            . Qatoto verifies neither side&apos;s account: it holds no money and sees no bank
            account.
          </>
        ),
      },
    ],
  },
  {
    heading: "An order, or a shipment",
    rows: [
      {
        problem: "An order placed with you",
        answer: (
          <>
            <Link href="/studio/sales" className="underline">
              Sales
            </Link>{" "}
            lists every order you have received and what still needs to go out. Each row opens the
            order itself, which is where its payments, its dispute and its shipments live.
          </>
        ),
      },
      {
        problem: "A shipment, or a tracking number that has not moved",
        answer: (
          <>
            <Link href="/studio/logistics" className="underline">
              Logistics
            </Link>{" "}
            holds every shipment across the orders you are carrying, leg by leg.
          </>
        ),
      },
    ],
  },
  {
    heading: "A quote, or a manufacturing inquiry",
    rows: [
      {
        problem: "A buyer asked you to quote",
        answer: (
          <>
            The request is in{" "}
            <Link href="/studio/rfqs" className="underline">
              Requests to quote
            </Link>
            , and what you have written back, sent or not, is in{" "}
            <Link href="/studio/quotes" className="underline">
              Your quotes
            </Link>
            . An unsubmitted quote blocks the next revision, so that list is the one place to check
            when a buyer says they are still waiting.
          </>
        ),
      },
      {
        problem: "A buyer wrote to your factory",
        answer: (
          <>
            <Link href="/studio/factory-inquiries" className="underline">
              Manufacturing inquiries
            </Link>{" "}
            holds buyers who have written to you. Drafts they have not sent are not there, so an
            inquiry a buyer says they started may genuinely not have arrived.
          </>
        ),
      },
      {
        problem: "Work you agreed to deliver",
        answer: (
          <>
            <Link href="/service-engagements" className="underline">
              Service engagements
            </Link>{" "}
            tracks agreed work, its milestones and what has been delivered, for both sides of the
            arrangement. What you offer buyers in the first place is in{" "}
            <Link href="/studio/services" className="underline">
              Services
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    heading: "What buyers are saying",
    rows: [
      {
        problem: "A review of your organization",
        answer: (
          <>
            <Link href="/studio/reviews" className="underline">
              Reviews
            </Link>{" "}
            carries what buyers said after an order or engagement completed. You can answer each one
            once, and revise that answer once within 30 days. Qatoto does not remove a review for
            being unfavourable.
          </>
        ),
      },
      {
        problem: "A question on one of your listings",
        answer: (
          <>
            <Link href="/studio/questions" className="underline">
              Questions
            </Link>{" "}
            lists every question asked on products you sell, oldest first, so the one waiting
            longest is at the top.
          </>
        ),
      },
      {
        problem: "Something to say to one buyer",
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
    heading: "Your videos, your listings, your company",
    rows: [
      {
        problem: "Something was actioned on one of your videos",
        answer: (
          <>
            <Link href="/studio/copyright" className="underline">
              Copyright and claims
            </Link>{" "}
            holds what has been decided about your videos, and the reports you filed about other
            people&apos;s. Qatoto never shows you who reported a video, and a report still under
            review is not listed.
          </>
        ),
      },
      {
        problem: "A listing of yours looks wrong, or will not publish",
        answer: (
          <>
            <Link href="/studio/products" className="underline">
              My Products
            </Link>{" "}
            is where a listing is edited and where a draft that has not gone live is visible.
          </>
        ),
      },
      {
        problem: "Your company details, or how buyers find you",
        answer: (
          <>
            <Link href="/studio/factory-profile" className="underline">
              Company profile
            </Link>{" "}
            is what the manufacturer directory shows buyers about you.
          </>
        ),
      },
    ],
  },
];

export default function StudioSupportTriage() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
        Most problems have a page that already records them, and going straight there is faster than
        describing it to someone who would send you there. If none of these fits, or one of them did
        not answer, open a case below and a person will read it.
      </p>

      {SELLER_TRIAGE_GROUPS.map((group) => (
        <section key={group.heading} aria-label={group.heading}>
          <h3 className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {group.heading}
          </h3>
          <dl className="mt-2 space-y-3">
            {group.rows.map((row) => (
              <div key={row.problem} className="rounded-xl border border-border px-4 py-3">
                <dt className="text-sm font-medium text-foreground">{row.problem}</dt>
                <dd className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                  {row.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* The doctrine, said once and in the open rather than implied by omission. */}
      <p className="max-w-2xl rounded-xl bg-muted px-4 py-3 text-xs leading-4 text-muted-foreground">
        Qatoto holds no money. There is no escrow here, so nothing on this page, a support case
        included, can release, reverse or refund a payment. What support can do is find out what
        happened and point you at the record of it.
      </p>
    </div>
  );
}
