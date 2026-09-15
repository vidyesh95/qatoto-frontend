// TRANSPORT: server-fetch — reads the auth cookie so the cases section paints the right thing on
// first render; the triage copy above it fetches nothing.
//
// ## WHAT CHANGED, AND WHY THIS IS NO LONGER A `StudioPlannedPage`
//
// This route rendered the honest placeholder, whose reason was recorded on the page itself: "a
// seller has no studio-scoped support surface, and counting somebody else's page as this one's
// delivery is exactly what `studio-planned-page.tsx` refuses to do." The argument UNDER that
// sentence was `todo.md`'s, and it was about the backend: "there is no ticket API, and
// `/customer-service` is a directory for exactly that reason. A support inbox means a real ticket
// domain AND somebody to read it."
//
// Both halves now exist. `POST/GET /support/cases`, the reply route and the staff queue at
// `/admin/support` shipped, so the case a seller opens here is read by a person. That is the whole
// change: the route did not become worth building because the Studio wanted a support page, it
// became buildable because the thing it would have faked got built.
//
// ## WHY IT IS HERE AND NOT A LINK TO `/customer-service`
//
// The sidebar already records this cost against a different route: `/sales` "lived under `(home)`
// and so threw a seller into this chrome on every row click", which is why it moved into
// `(studio)`. A signpost is that failure with an extra hop in front of it.
//
// ## ⚠️ THESE ARE NOT SELLER CASES, AND THE PAGE SAYS SO
//
// `/support/cases` is `requireAuth` and nothing else. There is no seller scope on the wire, no
// seller column on the table and no seller filter on the route, so this list is the SAME list as
// `/customer-service`. Filtering it down to `order_problem` and `payment_problem` to make it look
// seller-shaped was considered and rejected twice over: it is client-side filtering across a
// keyset-paged fetch, which CLAUDE.md bans outright, and it would hide a person's own cases from
// the page they came to for them. The scope is stated once, under the heading, and never implied.
//
// ## ⚠️ A CASE HAS ONE ADDRESS, AND IT IS NOT UNDER `/studio`
//
// Rows open `/customer-service/cases/[caseId]`, which `notifications/format.ts` already deep-links
// when support replies. A `/studio/support/cases/[caseId]` twin would give one case two URLs and
// leave the notification pointing at the other one. A chrome switch on click is the smaller defect,
// and it is the one a reader can see.
import { Suspense } from "react";

import SupportCasesIsland from "@/components/home/customer-service/support-cases-island";
import StudioSupportTriage from "@/components/studio/support/studio-support-triage";
import { hasCallerSession } from "@/lib/server-http";

export default function StudioSupportPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Support</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Every case on your account, whether you were selling or buying. These are the same cases you
        see on Customer service; there is no separate seller queue.
      </p>

      <section aria-label="Where to go" className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Where to go first</h2>
        <div className="mt-3">
          <StudioSupportTriage />
        </div>
      </section>

      <section aria-label="Your support cases" className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Your support cases</h2>
        <div className="mt-3 max-w-2xl">
          {/*
            THE COOKIE READ IS CONTAINED IN THIS SUBTREE, the containment `customer-service-page`
            documents: awaiting `hasCallerSession()` above the triage copy would make the whole
            route dynamic, and the authored half of this page has no reason to be. The fallback is
            the SIGNED-OUT component rather than a skeleton, so the shift when the real answer
            lands is a prompt becoming a list, never a layout jump.
          */}
          <Suspense fallback={<SupportCasesIsland isViewerSignedIn={false} />}>
            <SupportCasesSlot />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function SupportCasesSlot() {
  return <SupportCasesIsland isViewerSignedIn={await hasCallerSession()} />;
}
