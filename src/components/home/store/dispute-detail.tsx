// TRANSPORT: mock — there is NO participant-scoped read for a dispute. `GET /commerce/disputes/:disputeId`
// does not exist, so this page can display no dispute and does not pretend to.
"use client";

// A ROUTE WITH NOTHING BEHIND IT, and this file's whole job is to say so honestly.
//
// WHAT THE BACKEND ACTUALLY EXPOSES, verified in `commerce-trust.routes.ts`:
//
//   `POST /commerce/orders/:orderId/disputes`            — a buyer or provider RAISES one
//   `GET  /commerce/admin/disputes`                      — an ADMIN lists them
//   `POST /commerce/admin/disputes/:disputeId/decisions` — an ADMIN decides
//
// A participant can create a dispute and then never read it. There is no route that answers "what is
// happening with my dispute", which is exactly the question this URL is for.
//
// AND DO NOT WIRE IT TO `dispute.service.ts`. That file has a `DisputeView` with a tempting shape, and it
// belongs to the R&D PROOF-OF-EFFORT dispute domain — a different table, scoped to a research project, about
// contribution claims rather than orders. Wiring this page to it would show a commerce participant somebody
// else's equity dispute.
//
// WHY THIS IS NOT A FABRICATED PAGE. Every other mock on this surface renders a fixture shaped like a real
// projection, because the endpoint exists and wiring is a two-line edit. Here the endpoint does not exist, so
// a fixture would be inventing a contract — and the first thing that happens when the backend ships a real
// one is that every field name in the invention turns out to be wrong. Worse, a dispute page showing a
// plausible status is the single most harmful thing to fake on this platform: a participant reading
// "under review" would stop chasing it.

import Link from "next/link";

export default function DisputeDetail({ disputeId }: { disputeId: string }) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Dispute
        </p>
        <h1 className="font-serif text-xl font-semibold text-foreground md:text-2xl">
          This dispute cannot be shown yet
        </h1>
        {/* The id is echoed because it is the one thing that IS known, and a participant chasing a case needs
            it to quote. It is not presented as a record that was found. */}
        <p className="mt-1 font-mono text-xs leading-4 text-muted-foreground">{disputeId}</p>
      </header>

      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-900">
          Qatoto has no way to show you a dispute you raised.
        </p>
        <p className="mt-1 text-xs leading-4 text-amber-900">
          Raising a dispute works and it was recorded. Reading one back is not built: the only
          routes that list disputes or record decisions are restricted to platform administrators.
          This is a gap in the platform, not a problem with your case, and nothing about your
          dispute is lost.
        </p>
      </div>

      <section
        aria-label="What you can do now"
        className="rounded-xl border border-border px-4 py-3"
      >
        <p className="text-sm font-medium text-foreground">What you can do now</p>
        <ul className="mt-1 space-y-1 text-xs leading-4 text-muted-foreground">
          <li>
            The order this dispute was raised against still shows its own state and its full event
            history.
          </li>
          <li>Contact support with the reference above and they can see the case.</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/orders-and-returns"
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Your orders
          </Link>
          <Link
            href="/customer-service"
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            Contact support
          </Link>
        </div>
      </section>
    </div>
  );
}
