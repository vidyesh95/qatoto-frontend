// TRANSPORT: server-fetch — reads the auth cookie so the cases section paints the right thing
// on first render; the triage copy below it fetches nothing.
//
// ## THIS PAGE USED TO SAY THERE WAS NO SUPPORT CHANNEL, AND THAT IS NO LONGER TRUE
//
// Its banner read "A DIRECTORY, NOT A HELPDESK… there is no support-ticket API in this
// codebase", and the body told the reader "Qatoto does not run a ticket queue". Both were
// accurate and both are now false: `/support` exists, a person can open a case, staff answer it
// from an admin queue, and a reply notifies. Three other files in this repo have carried a
// stale absence-claim like that one, which is why this note replaces it rather than deleting
// it silently.
//
// ## WHAT SURVIVED THE REBUILD, AND WHY
//
// TRIAGE STILL COMES FIRST. The old page's argument was that a problem with a real home is
// solved faster there than through a queue, and that is still true — a dispute, an order, a
// settlement attestation and a moderation report each RECORD something a support thread only
// describes. What changed is the ending: "if none of them fits, use Contact Us" was a shrug at
// an email address, and it is now a case somebody reads.
//
// SIGNED-OUT VISITORS STILL LAND HERE, because the sidebar's "Help and settings" row carries
// no session requirement. So the page stays public and indexable, every triage link works
// without an account, and only the cases section asks for one.
import { Suspense } from "react";

import SupportCasesIsland from "@/components/home/customer-service/support-cases-island";
import TriageDirectory from "@/components/home/customer-service/triage-directory";
import { hasCallerSession } from "@/lib/server-http";

export default function CustomerServicePage() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Customer service
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Find the page that already holds your problem — or open a case and a person will answer.
        </p>
      </header>

      <section aria-label="Where to go" className="mt-4 px-4 lg:px-6">
        <TriageDirectory />
      </section>

      <section aria-label="Your support cases" className="mt-8 px-4 lg:px-6">
        <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
          Your support cases
        </h2>
        <div className="mt-2">
          {/*
            THE COOKIE READ IS CONTAINED IN THIS SUBTREE, the containment `navbar-account-slot`
            documents: awaiting `hasCallerSession()` above the triage copy would make the whole
            route dynamic, and the authored half of this page has no reason to be. The fallback
            is the SIGNED-OUT component rather than a skeleton, so the shift when the real
            answer lands is a prompt becoming a list, never a layout jump.
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
