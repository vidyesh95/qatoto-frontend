// TRANSPORT: props-only — authored copy over links. Fetches nothing.
//
// A DIRECTORY, NOT A HELPDESK, and the distinction is forced rather than chosen: there is no
// support-ticket API in this codebase. A page that offered a "contact support" form would be
// collecting messages nothing reads.
//
// So every row below points at a surface that ALREADY WORKS and is already wired to the backend.
// The one thing this page must never do is invent a channel — an unanswered form is worse than an
// honest signpost, because the person believes they have been heard.
//
// TWO LIVE ENTRY POINTS lead here: the sidebar's "Help and settings" row and the account menu. The
// sidebar row carries no `requiresSession`, so a signed-out visitor lands here too — which is why
// the ordering starts with things that do not need an account.
import Link from "next/link";

export default function CustomerService() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Customer Service</h1>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>Where to start</dt>
          <dd>
            Qatoto does not run a ticket queue. Every kind of problem below has its own surface, and
            going straight to it is faster than describing it to someone who would only send you
            there. If none of them fits, use{" "}
            <Link href="/contact-us" className="underline">
              Contact Us
            </Link>
            .
          </dd>
        </div>

        <div>
          <dt>An order you placed, or one placed with you</dt>
          <dd>
            <Link href="/orders-and-returns" className="underline">
              Orders and returns
            </Link>{" "}
            holds every order and its current state. Payments, refunds and the arrival window for
            each one live on the order itself. Sellers see the same orders under Studio.
          </dd>
        </div>

        <div>
          <dt>A disagreement about an order</dt>
          <dd>
            A dispute is a formal record between the two parties, not a message to Qatoto. Raise and
            track one from{" "}
            <Link href="/disputes" className="underline">
              Disputes
            </Link>
            .
          </dd>
        </div>

        <div>
          <dt>A question for a seller or a provider</dt>
          <dd>
            Talk to them directly in{" "}
            <Link href="/messages" className="underline">
              Messages
            </Link>
            . A thread is scoped to the thing it is about, so open it from the order, quote or
            inquiry rather than starting a new one.
          </dd>
        </div>

        <div>
          <dt>Work you commissioned</dt>
          <dd>
            <Link href="/service-engagements" className="underline">
              Service engagements
            </Link>{" "}
            tracks agreed work, its milestones and what has been delivered.
          </dd>
        </div>

        <div>
          <dt>A video that should not be on Qatoto</dt>
          <dd>
            Report it from the video itself — the control is under the player. A report is reviewed
            by a person, so nothing is hidden automatically and there is no instant outcome to wait
            for. What came of the ones you filed is in{" "}
            <Link href="/report-history" className="underline">
              Report history
            </Link>
            .
          </dd>
        </div>

        <div>
          <dt>A security vulnerability</dt>
          <dd>
            Please follow the{" "}
            <Link href="/vulnerability-disclosure-policy" className="underline">
              Vulnerability Disclosure Policy
            </Link>{" "}
            rather than reporting it through an ordinary channel.
          </dd>
        </div>

        <div>
          <dt>Your account, your data, or deleting either</dt>
          <dd>
            Account settings hold your profile, your privacy controls and your data export and
            deletion requests. What Qatoto stores and why is set out in the{" "}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </dd>
        </div>
      </dl>
    </main>
  );
}
